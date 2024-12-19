import * as tsl from '../translation/translationService';
import { CancellationToken, commands, Position, Range, TextDocument, workspace, Hover } from "vscode";

function getFullPhraseInQuotes(document: TextDocument, position: Position): string | undefined {
    const lineText = document.lineAt(position.line).text;
    const charPos = position.character;

    // Check if we are inside quotes
    const startQuote = lineText.lastIndexOf("'", charPos);
    const endQuote = lineText.indexOf("'", charPos);

    if (startQuote > -1 && endQuote > startQuote) {
        // Extract the entire string inside the quotes
        return lineText.substring(startQuote + 1, endQuote).trim();
    }

    // If not inside quotes, fall back to original word extraction
    const defaultRange = document.getWordRangeAtPosition(position);
    if (!defaultRange) return;
    return document.getText(defaultRange).replace(/"/g, "").trim();
}

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
                return definitions && definitions[0];
            }).then(async definition => {
                if (token.isCancellationRequested)
                    return Promise.reject('Canceled');

                const currentPhrase = getFullPhraseInQuotes(document, position);
                if (!currentPhrase) return;

                let translations = await tsl.showBaseAppTranslation(currentPhrase, false, false, false);
                if (translations.length > 0) {
                    return new Hover(`${translations} (translated by AL Navigator)`);
                }
            });
    }
}
