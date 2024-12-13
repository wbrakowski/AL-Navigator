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
    const transUnitRegex = /<trans-unit id="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/g;
    let updateCount = 0;

    const modifiedContent = documentText.replace(transUnitRegex, (match, id, content) => {
        const noteRegex = new RegExp(`<note[^>]*from="Developer"[^>]*>[\\s\\S]*?${languagePrefix}="([^"]+)"`, 'i');
        const targetRegex = /<target[^>]*>([\s\S]*?)<\/target>/;

        const noteMatch = noteRegex.exec(content);
        const targetMatch = targetRegex.exec(content);

        const targetContent = targetMatch ? targetMatch[1].trim() : '';

        // Skip if already translated, except for specific placeholders
        if (targetContent && targetContent !== '[NAB: NOT TRANSLATED]' && targetContent !== '[NAB: REVIEW]') {
            return match;
        }

        if (noteMatch) {
            const translation = noteMatch[1].trim();
            const indentationMatch = content.match(/^([ \t]*)<source>/m);
            const indentation = indentationMatch ? indentationMatch[1] : '    ';

            const targetTag = `${indentation}<target>${translation}</target>`;

            updateCount++;
            return targetMatch
                ? match.replace(targetRegex, `<target>${translation}</target>`)
                : match.replace(/<\/source>/, `</source>\n${targetTag}`);
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
