import { TranslationService } from "./translationService";

  
import { CancellationToken, commands, DefinitionProvider, Location, Position, Range, TextDocument, workspace, Hover } from "vscode";

const descriptionRegex = /^\s*;\s*\w+(\s*\[\s*\d+\s*\])?\s*\)\s*\{(\s*\w+\s*=[^;]*;)*\s*description\s*=\s*'(?<description>([^']|'')*)';/i;

exports.FieldHoverProvider = class FieldHoverProvider {
    
    /**
     * returns the Description of a field
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
            }).then(definition => {
                return workspace.openTextDocument(definition.uri).then(async textDocument => {
                    if (token.isCancellationRequested) return Promise.reject('Canceled');

                    let currentWordRange: Range | undefined = document.getWordRangeAtPosition(position);
                    if (!currentWordRange)
                        return;
                    let currentWord: string = document.getText(currentWordRange);
                    let translation = await TranslationService.getDynNavTranslations(currentWord, false);
                    if (translation) {
                        return new Hover(translation);
                    }
                    else {
                        return;
                    }
                });
            });
    }
}