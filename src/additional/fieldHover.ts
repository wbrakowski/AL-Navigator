import * as tsl from '../translation/translationService';
import { CancellationToken, commands, Position, Range, TextDocument, workspace, Hover } from "vscode";

function getFullPhraseInQuotes(document: TextDocument, position: Position): string | undefined {
    const lineText = document.lineAt(position.line).text;
    const charPos = position.character;

    // Helper function to find matching quote pair
    const findQuotePair = (quoteChar: string): { start: number; end: number } | null => {
        // Find the last opening quote before cursor
        let start = -1;
        for (let i = charPos - 1; i >= 0; i--) {
            if (lineText[i] === quoteChar) {
                start = i;
                break;
            }
        }

        if (start === -1) {
            return null;
        }

        // Find the first closing quote after start (or at cursor position)
        let end = -1;
        for (let i = start + 1; i < lineText.length; i++) {
            if (lineText[i] === quoteChar) {
                end = i;
                break;
            }
        }

        // Check if cursor is actually within this quote pair
        if (start > -1 && end > start && charPos > start && charPos <= end) {
            return { start, end };
        }

        return null;
    };

    // Try single quotes first
    let quotePair = findQuotePair("'");

    // If not in single quotes, try double quotes
    if (!quotePair) {
        quotePair = findQuotePair('"');
    }

    // If we found valid quotes, extract the content
    if (quotePair) {
        const extractedText = lineText.substring(quotePair.start + 1, quotePair.end).trim();

        // Return only if we have actual content
        if (extractedText.length > 0) {
            return extractedText;
        }
    }

    // If not inside quotes or empty content, fall back to original word extraction
    const defaultRange = document.getWordRangeAtPosition(position);
    if (!defaultRange) {
        return undefined;
    }
    return document.getText(defaultRange).replace(/["']/g, "").trim();
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
