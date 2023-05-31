import * as vscode from 'vscode';
import * as fs from "fs";
import {
    baseAppTranslationFiles,
    localBaseAppTranslationFiles,
} from "../external_resources/BaseAppTranslationFiles";
import { readFileSync } from "fs";

export async function showBaseAppTranslation(searchString: string | undefined, reverse: boolean, showTranslation: boolean): Promise<string[]> {
    console.log("Running: showBaseAppTranslation");
    let translations: string[];
    try {
        translations = await getTranslationsFromBaseApp(searchString, reverse);
    }
    catch (error) {
        vscode.window.showErrorMessage((error as Error).message);
        return;
    }
    console.log("Done: showBaseAppTranslation");

    if (showTranslation) {
        if (translations.length === 0) {
            vscode.window.showInformationMessage(`No translation found for "${searchString}"`);
        }
        else {
            vscode.window.showInformationMessage(`Input: "${searchString}, translation: ${translations}"`);
        }
    }
    return translations;
}

export async function getTranslationsFromBaseApp(searchString: string | undefined, reverse: boolean): Promise<string[]> {
    let config = vscode.workspace.getConfiguration("alNavigator");
    let maxNoOfTranslations: number = config.get('maxNoOfShownTranslations');
    let targetLanguage: string = config.get('translationTargetLanguage');
    let translations: string[];
    const baseAppTranslationMap = await getBaseAppTranslationMap(targetLanguage);
    if (baseAppTranslationMap !== undefined) {
        translations = matchTranslationsFromTranslationMap(baseAppTranslationMap, searchString, maxNoOfTranslations, reverse);
    }
    return translations;
}

export async function getBaseAppTranslationMap(targetLanguage: string): Promise<Map<string, string[]> | undefined> {
    const targetFilename = targetLanguage.toLocaleLowerCase().concat(".json");
    let localTransFiles = localBaseAppTranslationFiles();
    if (!localTransFiles.has(targetFilename)) {
        const downloadResult = await baseAppTranslationFiles.getBlobs([
            targetFilename,
        ]);
        if (downloadResult.failed.length > 0) {
            throw new Error(
                `Failed to download translation map for ${targetLanguage}.`
            );
        }
        localTransFiles = localBaseAppTranslationFiles();
    }

    const baseAppJsonPath = localTransFiles.get(targetFilename);
    let parsedBaseApp = {};
    if (baseAppJsonPath !== undefined) {
        let fileErrorMsg = "";
        const baseAppJsonContent = readFileSync(baseAppJsonPath, "utf8");
        if (baseAppJsonContent.length === 0) {
            fileErrorMsg = `No content in file, file was deleted: "${baseAppJsonPath}".`;
        } else {
            try {
                parsedBaseApp = JSON.parse(baseAppJsonContent);
            } catch (err) {
                fileErrorMsg = `Could not parse match file for "${targetFilename}". Message: ${(err as Error).message
                    }. Deleted corrupt file at: "${baseAppJsonPath}".`;
            }
        }
        if (fileErrorMsg !== "") {
            fs.unlinkSync(baseAppJsonPath);
            throw new Error(fileErrorMsg);
        }
    }
    return Object.keys(parsedBaseApp).length > 0
        ? new Map(Object.entries(parsedBaseApp))
        : undefined;
}


// export function matchTranslationsFromTranslationMaps(suggestionsMaps: Map<string, Map<string, string[]>[]>): number {
//     let numberOfMatchedTranslations = 0;
//     const maps = suggestionsMaps.get('de-de');
//     if (maps === undefined) {
//         return 0;
//     }
//     // Reverse order because of priority, latest added has highest priority
//     for (let index = maps.length - 1; index >= 0; index--) {
//         const map = maps[index];
//         numberOfMatchedTranslations += matchTranslationsFromTranslationMap(map);
//     }
//     return numberOfMatchedTranslations;
// }

export function matchTranslationsFromTranslationMap(matchMap: Map<string, string[]>, searchString: string | undefined, maxNo: number, reverse: boolean): string[] | undefined {
    let allTranslations: string[];
    let translations: string[] = [];
    let index = 0;
    if (reverse) {
        matchMap.forEach((value, key) => {
            if (value.includes(searchString)) {
                if (index <= maxNo) {
                    if (!key.includes("Property") && !key.includes("Table") && !key.includes("Field")) {
                        index++;
                        translations.push(key);
                    }
                }
            }
        });
    }
    else {
        if (matchMap.has(searchString)) {
            allTranslations = matchMap.get(searchString);
            if (maxNo > allTranslations.length) {
                maxNo = allTranslations.length;
            }
            for (index = 0; index < maxNo; index++) {
                translations[index] = allTranslations[index];
            }
        }
    }
    return translations;
}



