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

        let totalWordCount = 0;
        let totalCharCount = 0;

        // if no folder exists, do prompting
        // in this case, also add a command to change the folder to be counted
        // so, can reuse a showInputBox function that returns a Thenable

        const config = vscode.workspace.getConfiguration('authorWordCount');

        _getFolderName().then((folderName) => {
            if(folderName) {
                // sanitize input to remove trailing slash if applicable
                if(folderName.endsWith('/')) {
                    folderName = folderName.substring(0, folderName.length - 1);
                }

                config.update('mainFolder', folderName, vscode.ConfigurationTarget.Global);
            } else {
                folderName = config.get('mainFolder');
            }

            let promises = [];

            vscode.window.showInformationMessage(folderName
                ? `Counting words for all markdown files in ${folderName}`
                : `Now counting all words!`);

            const include = `**/${folderName ? folderName+'/' : ''}**/*.${MARKDOWN_EXTENSION}`;
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
                        _clearAndShowOutput();

                        // only display current file count if within the main folder
                        const regexSlashes = String.raw`(\\|/)`;
                        if(doc.fileName.match(new RegExp(`${regexSlashes}${folderName}${regexSlashes}`)) && doc.fileName.endsWith('md')) {
                            _displayCountCurrentFile(doc);
                        }
                        output.appendLine(``);
                        output.appendLine(`Total Count (within '${folderName}' folder)`);
                        output.appendLine(`${totalWordCount.toLocaleString()} words | ${totalCharCount.toLocaleString()} characters`);
                    });
                });
        });
    });

    let countFileCommand = vscode.commands.registerCommand('awc.countInFile', () => {
        const doc = vscode.window.activeTextEditor.document;

        if(!doc.fileName.endsWith('md')) {
            vscode.window.showInformationMessage(`Current file is not a markdown file`);
            return false;
        }

        vscode.window.showInformationMessage('Now counting in '+ doc.fileName.match(/\w+(\s+\w+)*\.md/)[0]);

        _clearAndShowOutput();

        _displayCountCurrentFile(doc);
    });

    context.subscriptions.push(countAllCommand);
    context.subscriptions.push(countFileCommand);
}

exports.deactivate = () => {
    output.dispose();
}

// private functions
_getFolderName = () => {
    if (vscode.workspace.getConfiguration('authorWordCount').get('mainFolder')) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
    return vscode.window.showInputBox({prompt: 'Folder to count words in?', value: 'book', placeHolder: 'base folder name'});
};

_countWords = (doc) => {
    let docContent = doc.getText();
    let wordCount = 0;

    // Parse out unwanted whitespace so the split is accurate
    docContent = docContent
        .replace(/(< ([^>]+)<)/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^\s\s*/, '')
        .replace(/\s\s*$/, '');
    if (docContent != "") {
        wordCount = docContent.split(" ").length;
    }

    return wordCount;
};

_countCharacters = (doc) => {
    return doc.getText().length;
};

_clearAndShowOutput = () => {
    output.clear();
    output.show();
};

_displayCountCurrentFile = (doc) => {
    output.appendLine(`Current file (${doc.fileName.match(/\w+(\s+\w+)*\.md/)[0]})`);
    output.appendLine(`${_countWords(doc).toLocaleString()} words | ${_countCharacters(doc).toLocaleString()} characters`);
};