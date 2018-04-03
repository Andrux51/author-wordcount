const vscode = require('vscode');

const MARKDOWN_EXTENSION = 'md';

let output;

// your extension is activated the very first time a command is executed
exports.activate = (context) => {
    output = vscode.window.createOutputChannel("Author Word Count");

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let countAllCommand = vscode.commands.registerCommand('awc.countAll', function () {
        const doc = vscode.window.activeTextEditor.document;

        output.clear();
        output.show();
        
        let totalWordCount = 0;
        let totalCharCount = 0;

        // if no folder exists, do prompting
        // in this case, also add a command to change the folder to be counted
        // so, can reuse a showInputBox function that returns a Thenable

        // let countFolder = context.globalState.get('countFolder');

        _getFolderName().then((inputResult) => {
            if(inputResult) {
                context.globalState.update('countFolder', inputResult);

                // sanitize input to remove trailing slash if applicable
                if(inputResult.endsWith('/')) {
                    inputResult = inputResult.substring(0, inputResult.length - 1);
                }
            }

            let promises = [];

            vscode.window.showInformationMessage(inputResult
                ? `Counting words for all markdown files in ${inputResult}`
                : `Now counting all words!`);

            const include = `${inputResult ? inputResult+'/' : ''}**/*.${MARKDOWN_EXTENSION}`;
            const exclude = `**/{node_modules,bower_components}/**`;
            vscode.workspace.findFiles(include, exclude)
                .then((result) => {
                    result.forEach((textDocFileName) => {
                        promises.push(new Promise((resolve) => {
                            vscode.workspace.openTextDocument(textDocFileName)
                                .then((textDoc) => {
                                    totalWordCount += _countWords(textDoc);
                                    totalCharCount += _countCharacters(textDoc);
                                    resolve(true);
                                });
                        }));
                    });
                })
                .then(() => {
                    Promise.all(promises).then(() => {
                        output.appendLine(`
                            Current file: ${_countWords(doc).toLocaleString()} words | ${_countCharacters(doc).toLocaleString()} characters
                        `);
                        output.appendLine(`
                            Total Count: ${totalWordCount.toLocaleString()} words | ${totalCharCount.toLocaleString()} characters
                        `);
                    });
                });
        });
    });

    let countFileCommand = vscode.commands.registerCommand('awc.countInFile', () => {
        vscode.window.showInformationMessage('Now counting in '+ vscode.window.activeTextEditor.document.fileName);

        const doc = vscode.window.activeTextEditor.document;

        output.clear();
        output.show();

        output.appendLine(`
            Current file: ${_countWords(doc).toLocaleString()} words | ${_countCharacters(doc).toLocaleString()} characters
        `);
    });

    /*
        Command: AWC: View Author Word Count
         - display word count(s) in status bar
         x open output channel
         x show word count for all files
         x show word count for current file
         - show word count for selection
         x show character count for current file (optional)
         - show character count for selection (optional)
         x show character count for all files (optional)
         x clear before next display 
         - clear and redraw on file change (have some kind of timeout to debounce this (2 sec?))
         - be sure to update on workspace folder change, file added, etc.
         - show page count* (possibly large effort, explain estimating by lines per page)
         - show daily word count* (maybe impossible, based on UX)
    */

    context.subscriptions.push(countAllCommand);
    context.subscriptions.push(countFileCommand);
}

exports.deactivate = () => {
    output.dispose();
}

// private functions
_getFolderName = () => {
    return vscode.window.showInputBox({prompt: 'Folder to count words in?', value: 'book', placeHolder: 'base folder name'});
};

_countWords = (doc) => {
    let docContent = doc.getText();

    // Parse out unwanted whitespace so the split is accurate
    docContent = docContent.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
    docContent = docContent.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    let wordCount = 0;
    if (docContent != "") {
        wordCount = docContent.split(" ").length;
    }

    return wordCount;
};

_countCharacters = (doc) => {
    return doc.getText().length;
};