import * as vscode from 'vscode';

// Mapping between XLF file language codes and note prefixes
const languageMap: Record<string, string> = {
    'de-DE': 'DEU',
    'en-US': 'ENU',
    'es-ES': 'ESN',
    'fr-FR': 'FRA',
    'it-IT': 'ITA',
    'nl-NL': 'NLD',
    'da-DK': 'DAN',
    'sv-SE': 'SVE',
    'no-NO': 'NOR',
    'fi-FI': 'FIN',
};

export async function insertTranslationFromComment() {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith('.xlf')) {
        vscode.window.showErrorMessage('Please open a valid XLF file.');
        return;
    }

    const fileName = editor.document.fileName;

    if (fileName.includes('g.xlf')) {
        vscode.window.showErrorMessage('Source XLF files (g.xlf) cannot be processed.');
        return;
    }

    const languageCode = Object.keys(languageMap).find(lang => fileName.includes(lang));
    if (!languageCode) {
        vscode.window.showErrorMessage('Unsupported language file.');
        return;
    }
    const languagePrefix = languageMap[languageCode];

    const documentText = editor.document.getText();
    const targetRegex = /<trans-unit id="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/g;
    let updateCount = 0;

    const modifiedContent = documentText.replace(targetRegex, (match, id, content) => {
        const noteRegex = new RegExp(`<note[^>]*from="Developer"[^>]*>${languagePrefix}="([^"]+)"</note>`);
        const targetRegex = /<target>([\s\S]*?)<\/target>/;

        const noteMatch = noteRegex.exec(content);
        const targetMatch = targetRegex.exec(content);

        if (noteMatch) {
            const translation = noteMatch[1].trim();
            const targetValue = targetMatch ? targetMatch[1].trim() : null;

            if (targetValue === translation) {
                return match;
            }

            const indentationMatch = content.match(/^(\s*)<source>/m);
            const indentation = indentationMatch ? indentationMatch[1] : '    ';
            const targetTag = targetMatch
                ? `<target>${translation}</target>`
                : `${indentation}<target>${translation}</target>`;

            updateCount++;
            return targetMatch
                ? match.replace(targetRegex, targetTag)
                : match.replace(/<\/source>/, `</source>${targetTag}`);
        }

        return match;
    });

    if (documentText === modifiedContent) {
        vscode.window.showInformationMessage('No translations were updated.');
        return;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(documentText.length)
    );
    edit.replace(editor.document.uri, fullRange, modifiedContent);

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
        vscode.window.showInformationMessage(`Translations successfully updated. ${updateCount} element(s) were changed.`);
    } else {
        vscode.window.showErrorMessage('Failed to update translations.');
    }
}
