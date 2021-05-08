// import * as assert from 'assert';
// import { suite, test } from 'mocha';
// import { TranslationService } from '../../additional/translationService';
// import * as vscode from 'vscode';

// suite('MS Translation Service Tests', () => {

//     test('getMicrosoftSearchUrl', async () => {
//         // https://stackoverflow.com/questions/49120994/unit-test-vscode-extension-with-specific-configuration-settings



//         // https://www.microsoft.com/de-de/language/Search?&searchTerm=%22Item%20No.%22&langID=354&Source=true&productid=564
//         let searchString = 'Item Ledger Entry';

//         let testTargetLang = 'Polish';


//         let config = vscode.workspace.getConfiguration("alNavigator");
//         await config.update('translationTargetLanguage', testTargetLang, true);

//         console.log('passt');
//         assert.strictEqual(config.get('translationTargetLanguage'), testTargetLang);
//         let targetTranslation = TranslationService.getTargetTranslationFromConfig();
//         assert.strictEqual(targetTranslation, testTargetLang);
//         let url: string = TranslationService.getMicrosoftSearchUrl(searchString);

//         let langId = TranslationService.getLanguageId(targetTranslation);
//         assert.strictEqual(langId, '591');
//         assert.notEqual(url.indexOf('Item+Ledger+Entry'), -1);
//         assert.notEqual(url.indexOf(langId), -1);
//         assert.notEqual(url.indexOf(TranslationService.msProductId), -1);
//     });

//     test('getTargetTranslationFromConfig', () => {
//         let testTargetLang = 'Polish';
//         let config = vscode.workspace.getConfiguration('alNavigator');
//         config.update('translationTargetLanguage', testTargetLang).then(() => {
//             assert.strictEqual(TranslationService.getTargetTranslationFromConfig(), testTargetLang);
//         });
//     });

//     test('getLanguageId', () => {
//         let targetTranslation = 'Danish';
//         let langId = TranslationService.getLanguageId(targetTranslation);
//         assert.strictEqual(langId, '142');

//         targetTranslation = '';
//         langId = TranslationService.getLanguageId(targetTranslation);
//         assert.strictEqual(langId, TranslationService.msDefLangId);
//     });


//     // test('showMicrosoftTranslation', () => {
//     //     let searchString = 'Item Ledger Entry';
//     //     // console.log(`searchstring: ${searchString}`);        
//     //     let testTargetLang = 'Polish';
//     //     console.log(`target language: ${testTargetLang}`);
//     //     let config = vscode.workspace.getConfiguration('alNavigator');
//     //     config.update('translationTargetLanguage', testTargetLang).then(() => {
//     //         assert.strictEqual(config.get('translationTargetLanguage'), testTargetLang);
//     //         console.log('4');
//     //         let translations = TranslationService.showMicrosoftTranslation(searchString);
//     //         console.log('5');
//     //         if (translations) {
//     //             console.log('6 ' + translations);
//     //             assert.strictEqual(translations, 'Artikelpsfsfosten');
//     //         }
//     //         else {
//     //             console.log('7');
//     //             // TODO Error?
//     //             console.log('Oh no what happened?');
//     //         }
//     //     });
//     //     console.log('8');
//     // });


//     test('openSearchUrl', () => {
//         // TODO Test openSearchUrl
//     });

//     // TODO extractTranslationsFromResponseText
// });