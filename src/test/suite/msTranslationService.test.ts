import * as assert from 'assert';
import { suite, test } from 'mocha';
import { TranslationService } from '../../additional/translationService';
import * as vscode from 'vscode';

suite('MS Translation Service Tests', () => {

    test('getMicrosoftSearchUrl', () => {
        console.log('getMicrosoftSearchUrl');
        // https://www.microsoft.com/de-de/language/Search?&searchTerm=%22Item%20No.%22&langID=354&Source=true&productid=564
        let searchString = 'Item Ledger Entry';

        let testTargetLang = 'Polish';
        let config = vscode.workspace.getConfiguration('alNavigator');
        config.update('translationTargetLanguage', testTargetLang).then(() =>   {    
            assert.strictEqual(config.get('translationTargetLanguage'), testTargetLang);
        });

        let targetTranslation = TranslationService.getTargetTranslationFromConfig();
        assert.strictEqual(targetTranslation, testTargetLang);

        let url: string = TranslationService.getMicrosoftSearchUrl(searchString);
        console.log(url);

        let langId = TranslationService.getLanguageId(targetTranslation);
        assert.strictEqual(langId, '591');
        assert.notEqual(url.indexOf('Item+Ledger+Entry'), -1);
        assert.notEqual(url.indexOf(langId), -1);
        assert.notEqual(url.indexOf(TranslationService.msProductId), -1);
    });

    test('getTargetTranslationFromConfig', () => {
        console.log('getTargetTranslationFromConfig');
        let testTargetLang = 'Polish';
        let config = vscode.workspace.getConfiguration('alNavigator');
        config.update('translationTargetLanguage', testTargetLang).then( () => {
            assert.strictEqual(TranslationService.getTargetTranslationFromConfig(), testTargetLang);
        });        
    });

    test('getLanguageId', () => {
        console.log('getLanguageId');
        let targetTranslation = 'Danish';
        let langId = TranslationService.getLanguageId(targetTranslation);
        assert.strictEqual(langId, '142');

        targetTranslation = '';
        langId = TranslationService.getLanguageId(targetTranslation);
        assert.strictEqual(langId, TranslationService.msDefLangId);
    });
    // TODO Test fetchTranslation

    // TODO Test openSearchUrl
});