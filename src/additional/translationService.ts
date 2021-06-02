import open = require('open');
import { window } from 'vscode';
import { StringFunctions } from './stringFunctions';
import * as vscode from 'vscode';
const axios = require('axios');

export class TranslationService {
	public msTranslationUrl: any;
	public msDynNavProductId: any;
	public msDefLangId: any;
	public msAllProductsId: any;
	public msFinOpProductId: any;
    // static readonly msTranslationUrl = 'https://www.microsoft.com/en-us/language/Search?&searchTerm=%22|SearchString|%22';
    static readonly msTranslationUrl = 'https://www.microsoft.com/en-us/language/Search?&searchTerm=|SearchString|';
    static readonly msAllProductsId = '0'; // All Products
    static readonly msFinOpProductId = '639';
    static readonly msDynNavProductId = '564'; // Dynamics NAV
    static readonly msDefLangId = '354'; // German

    public static getMicrosoftSearchUrl(searchString: string, reverse: boolean, productId: string): string {
        let searchUrl = StringFunctions.replaceAll(this.msTranslationUrl, '|SearchString|', searchString.split(' ').join('+'));
        let targetTranslation = this.getTranslationFromConfig();
        let langId = this.getLanguageId(targetTranslation);
        let source = reverse ? 'false' : 'true';
        searchUrl += `&langID=${langId}&productid=${productId}&Source=${source}`;
        return searchUrl;
    }

    public static openSearchUrl(searchString: string | undefined, reverse: boolean, productId: string) {
        if (searchString) {
            let url = this.getMicrosoftSearchUrl(searchString, reverse, productId);
            open(url);
        }
    }

    public static openDynNavSearchUrl(searchString: string | undefined, reverse: boolean) {
        this.openSearchUrl(searchString, reverse, this.msDynNavProductId);
    }

    public static getTranslationFromConfig(): any {
        let config = vscode.workspace.getConfiguration('alNavigator');
        return config.get('translationTargetLanguage');
    }

    public static getMaxNoOfTranslationsFromConfig(): any {
        let config = vscode.workspace.getConfiguration('alNavigator');
        return config.get('maxNoOfShownTranslations');
    }

    public static getLanguageId(translationLang: string): string {
        let langId: string;
        switch (translationLang) {
            case 'Afrikaans':
                langId = '6';
                break;
            case 'Albanian':
                langId = '12';
                break;
            case 'Amharic':
                langId = '19';
                break;
            case 'Arabic':
                langId = '39';
                break;
            case 'Armenian':
                langId = '49';
            case 'Assamese':
                langId = '51';
                break;
            case 'Azerbaijani Latin':
                langId = '59';
                break;
            case 'Bangla Bangladesh':
                langId = '67';
                break;
            case 'Bangla India':
                langId = '68';
                break;
            case 'Baseque':
                langId = '74';
                break;
            case 'Belarusian':
                langId = '76';
                break;
            case 'BosnianCyrillic':
                langId = '87';
                break;
            case 'BosnianLatin':
                langId = '88';
                break;
            case 'Bulgarian':
                langId = '93';
                break;
            case 'Catalan':
                langId = '100';
                break;
            case 'CentralKurdish':
                langId = '111';
                break;
            case 'Cherokee':
                langId = '117';
                break;
            case 'ChineseSimp':
                langId = '124';
                break;
            case 'ChineseTradHKSar':
                langId = '127';
                break;
            case 'ChineseTradTaiwan':
                langId = '129';
                break;
            case 'Croatian':
                langId = '137';
                break;
            case 'Czech':
                langId = '140';
                break;
            case 'Danish':
                langId = '142';
                break;
            case 'Dari':
                langId = '145';
                break;
            case 'Dutch':
                langId = '155';
                break;
            case 'EnlishUK':
                langId = '262';
                break;
            case 'Estonian':
                langId = '273';
                break;
            case 'Filipino':
                langId = '283';
                break;
            case 'Finnish':
                langId = '285';
                break;
            case 'French':
                langId = '303';
                break;
            case 'FrenchCanada':
                langId = '293';
                break;
            case 'Galician':
                langId = '346';
                break;
            case 'Georgian':
                langId = '350';
                break;
            case 'German':
                langId = '354';
                break;
            case 'Greek':
                langId = '361';
                break;
            case 'Gujarati':
                langId = '367';
                break;
            case 'Hausa':
                langId = '374';
                break;
            case 'Hebrew':
                langId = '378';
                break;
            case 'Hindi':
                langId = '380';
                break;
            case 'Hungarian':
                langId = '382';
                break;
            case 'Icelandic':
                langId = '386';
                break;
            case 'Igbo':
                langId = '388';
                break;
            case 'Indonesian':
                langId = '391';
                break;
            case 'Inuktitut':
                langId = '397';
                break;
            case 'Irish':
                langId = '402';
                break;
            case 'isiXhosa':
                langId = '404';
                break;
            case 'isiZulu':
                langId = '406';
                break;
            case 'Italian':
                langId = '408';
                break;
            case 'Japanese':
                langId = '412';
                break;
            case 'Kiche':
                langId = '421';
                break;
            case 'Kannada':
                langId = '434';
                break;
            case 'Kazakh':
                langId = '443';
                break;
            case 'Khmer':
                langId = '445';
                break;
            case 'Kinyarwanda':
                langId = '449';
                break;
            case 'Kishwahili':
                langId = '452';
                break;
            case 'Konkani':
                langId = '455';
                break;
            case 'Korean':
                langId = '457';
                break;
            case 'Kyrgyz':
                langId = '467';
                break;
            case 'Lao':
                langId = '473';
                break;
            case 'Latvian':
                langId = '477';
                break;
            case 'Lithuanian':
                langId = '484';
                break;
            case 'Luxembourgish':
                langId = '496';
                break;
            case 'Macedonian':
                langId = '500';
                break;
            case 'MalayBruneiDarus':
                langId = '510';
                break;
            case 'MalayMalaysia':
                langId = '512';
                break;
            case 'Malayalam':
                langId = '514';
                break;
            case 'Maltese':
                langId = '516';
                break;
            case 'Maori':
                langId = '522';
                break;
            case 'Marathi':
                langId = '526';
                break;
            case 'MongolianCyrillic':
                langId = '540';
                break;
            case 'Nepali':
                langId = '554';
                break;
            case 'NorwegianBokmal':
                langId = '568';
                break;
            case 'NorwegianNynorsk':
                langId = '570';
                break;
            case 'OdiaIndia':
                langId = '577';
                break;
            case 'Pashto':
                langId = '587';
                break;
            case 'Persian':
                langId = '589';
                break;
            case 'Polish':
                langId = '591';
                break;
            case 'PortugueseBrazil':
                langId = '594';
                break;
            case 'PortuguesePortugal':
                langId = '601';
                break;
            case 'Punjabi':
                langId = '613';
                break;
            case 'PunjabiArabic':
                langId = '614';
                break;
            case 'Quechua':
                langId = '617';
                break;
            case 'Romanian':
                langId = '623';
                break;
            case 'Russian':
                langId = '635';
                break;
            case 'ScottishGaelic':
                langId = '662';
                break;
            case 'SerbianCyrillicBiH':
                langId = '667';
                break;
            case 'SerbianCyrillicSerbia':
                langId = '671';
                break;
            case 'SerbianLatinSerbia':
                langId = '677';
                break;
            case 'SesothoSaLeboa':
                langId = '682';
                break;
            case 'Setswana':
                langId = '685';
                break;
            case 'Sindhi':
                langId = '695';
                break;
            case 'Sinhala':
                langId = '697';
                break;
            case 'Slovak':
                langId = '700';
                break;
            case 'Slovenian':
                langId = '702';
                break;
            case 'Spanish':
                langId = '736';
                break;
            case 'SpanishMexico':
                langId = '729';
                break;
            case 'Swedish':
                langId = '750';
                break;
            case 'Tajik':
                langId = '763';
                break;
            case 'Tamil':
                langId = '766';
                break;
            case 'Tatar':
                langId = '773';
                break;
            case 'Telugu':
                langId = '775';
                break;
            case 'Thai':
                langId = '780';
                break;
            case 'Tigrinya':
                langId = '788';
                break;
            case 'Turkish':
                langId = '795';
                break;
            case 'Turkmen':
                langId = '797';
                break;
            case 'Ukrainian':
                langId = '799';
                break;
            case 'Urdu':
                langId = '804';
                break;
            case 'Uyghur':
                langId = '806';
                break;
            case 'UzbekLatin':
                langId = '810';
                break;
            case 'Valencian':
                langId = '820';
                break;
            case 'Vietnamese':
                langId = '823';
                break;
            case 'Qayuu':
                langId = '831';
                break;
            case 'Welsh':
                langId = '833';
                break;
            case 'Wolof':
                langId = '837';
                break;
            case 'Yoruba':
                langId = '846';
                break;
            default:
                langId = this.msDefLangId;
        }
        return langId;
    }

    public static async showMicrosoftDynNavTranslation(searchString: string | undefined, reverse: boolean): Promise<string[] | undefined> {
        return await this.showMicrosoftTranslation(searchString, reverse, this.msDynNavProductId);
    }

    public static async showMicrosoftTranslation(searchString: string | undefined, reverse: boolean, productId: string): Promise<string[] | undefined> {
        let translations = await TranslationService.getTranslations(searchString, reverse, productId)
        if (translations) {
            if (translations.length > 0) {
                vscode.window.showInformationMessage(`Input: ${searchString}, translations: ${translations}`);
                return translations;
            }
            else {
                let product1 = 'All products';
                let product2 = 'Microsoft Dynamics NAV';
                let product3 = 'Microsoft Dynamics 365 for Finance and Operations, Business Edition';
                let products: string[] = [];
                products[0] = product1;
                products[1] = product2;
                products[2] = product3;
                let translationProduct = await vscode.window.showQuickPick(products, {
                    canPickMany: false,
                    placeHolder: `No translation found for product id ${productId}. Check translations for other products?`
                });
                if (translationProduct) {
                    switch(translationProduct) 
                    {
                        case product1:
                            this.showMicrosoftTranslation(searchString, reverse, this.msAllProductsId);
                            break;
                        case product2:
                            this.showMicrosoftTranslation(searchString, reverse, this.msDynNavProductId);
                            break;
                        case product3:
                            this.showMicrosoftTranslation(searchString, reverse, this.msFinOpProductId);
                            break;
                    }
                    // vscode.window.showInformationMessage(`No translation found for input: ${searchString}`);
                }
                return;
            }
        }
    }

    public static async getDynNavTranslations(searchString: string | undefined, reverse: boolean): Promise<string[] | undefined> {
        return await TranslationService.getTranslations(searchString, reverse, this.msDynNavProductId);
    }

    public static async getTranslations(searchString: string | undefined, reverse: boolean, productId: string): Promise<string[] | undefined> {
        if (searchString) {
            console.log(`Fetching Translation from Microsoft for string: ${searchString}`);
            let url = this.getMicrosoftSearchUrl(searchString, reverse, productId);
            try {
                const response = await axios.get(url);
                if (response.status === 200) {
                    // Status OK
                    let responseText: string = response.data;
                    let translations: string[] | undefined = await TranslationService.extractTranslationsFromResponseText(responseText, reverse, true);
                    return translations;
                }
                else {
                    vscode.window.showErrorMessage(`An unknown occured during translation: Unexpected status: ${response.status}`);
                    return;
                }
            } catch (exception) {
                process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
                return;
            }
        }
    }

    private static async extractTranslationsFromResponseText(responseText: string, reverse: boolean, onlyOneTranslation: boolean): Promise<string[] | undefined> {
        let translations: string[] = [];
        let tdString = reverse ? '<td class="trs_source_clm">' : '<td class="trs_target_clm">';
        let tdStringStartIdx: number;
        let maxNoOfTranslations = onlyOneTranslation ? 1 : this.getMaxNoOfTranslationsFromConfig();
        let pos = 0;    
        do {
            tdStringStartIdx = responseText.indexOf(tdString, pos);
            if (tdStringStartIdx > -1) {
                let translationStartIdx: number = tdStringStartIdx + tdString.length;
                if (translationStartIdx === -1) {
                    // TODO Http response is for some reason corrupt
                    return;
                }
                let tdStringEndIdx: number = responseText.indexOf('</td>', translationStartIdx);
                if (tdStringEndIdx > -1) {
                    let translationText = responseText.substring(translationStartIdx, tdStringEndIdx);
                    if (!translations.includes(translationText)) {
                        translations.push(translationText);
                    }
                }
                pos = tdStringEndIdx;
            }
        } while ((tdStringStartIdx !== -1) && (translations.length < maxNoOfTranslations));
        return translations;
    }
}
