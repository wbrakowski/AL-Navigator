import * as vscode from 'vscode';
import { TranslationService } from './translationService';
import * as DocUtils from './docUtils';

export function openMicrosoftTranslation(reverse: boolean) {
    console.log('Running: openMicrosoftTranslation');

    let currentword = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";
    vscode.window.showInputBox({ value: currentword, prompt: "Translate String:" }).then(searchString =>
        TranslationService.openDynNavSearchUrl(searchString, reverse));

    console.log('Done: openMicrosoftTranslation');
}

export function showMicrosoftTranslation(reverse: boolean) {
    console.log('Running: showMicrosoftTranslation');

    let currentWord = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";
    vscode.window.showInputBox({ value: currentWord, prompt: "Translate String:" }).then(searchString =>
        TranslationService.showMicrosoftDynNavTranslation(searchString, reverse));

    console.log('Done: showMicrosoftTranslation');
}
