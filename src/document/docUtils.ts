import * as vscode from 'vscode';
import { ALFileCrawler } from '../al/alFileCrawler';

export function getSelectedWord(editor: vscode.TextEditor): string {
    const selection = editor.selection;
    const doc = editor.document;
    if (selection.isEmpty) {
        const cursorWordRange = doc.getWordRangeAtPosition(selection.active);

        if (cursorWordRange) {
            let newSelection = new vscode.Selection(cursorWordRange.start.line, cursorWordRange.start.character, cursorWordRange.end.line, cursorWordRange.end.character);
            editor.selection = newSelection;
            return editor.document.getText(editor.selection);

        } else {
            return '';
        }
    } else {
        return editor.document.getText(editor.selection);
    }
}

export function getCurrentLineText(editor: vscode.TextEditor): string {
    let currLine = editor.document.lineAt(editor.selection.start.line);
    let currLineText: string = currLine.text;
    if (ALFileCrawler.isComment(currLineText)) {
        vscode.window.showInformationMessage(`The current line ${editor.selection.start.line} contains a comment. Operation failed.`);
        return '';
    }
    else {
        return currLineText;
    }
}
