import * as tsl from './translationService';


import { CancellationToken, commands, Position, Range, TextDocument, workspace, Hover } from "vscode";


exports.FieldHoverProvider = class FieldHoverProvider {

    /**
     * returns the translation of symbols
     * 
     * @param {vscode.TextDocument} document 
     * @param {vscode.Position} position 
     * @param {vscode.CancellationToken} token 
     * 
     * @returns {vscode.ProviderResult<vscode.Hover>}
     */
    async provideHover(document: TextDocument, position: Position, token: CancellationToken) {
        return commands.executeCommand('vscode.executeDefinitionProvider', document.uri, position)
            .then(definitions => {
                if (token.isCancellationRequested) return Promise.reject('Canceled');
                // if (definitions.length !== 1) return Promise.reject('No or multiple definitions found');
                return definitions[0];
            }).then(async definition => {
                // const textDocument = await workspace.openTextDocument(definition.uri);
                if (token.isCancellationRequested)
                    return Promise.reject('Canceled');
                let currentWordRange: Range | undefined = document.getWordRangeAtPosition(position);
                if (!currentWordRange)
                    return;
                let currentWord: string = document.getText(currentWordRange);
                currentWord = currentWord.replace(/"/g, "");
                let translations = await tsl.showBaseAppTranslation(currentWord, false, false);
                if (translations.length > 0) {
                    return new Hover(`${translations} (translated by AL Navigator)`);
                }
                else {
                    return;
                }
            });
    }
}