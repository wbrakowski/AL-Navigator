import * as vscode from 'vscode';
import { TranslationService } from './translationService';
import * as DocUtils from './docUtils';

export function openMicrosoftTranslation() {
    console.log('Running: openMicrosoftTranslation');

    let currentword = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";
    vscode.window.showInputBox({ value: currentword, prompt: "Translate String:" }).then(SearchString =>
        TranslationService.openSearchUrl(SearchString));

    console.log('Done: openMicrosoftTranslation');
}
