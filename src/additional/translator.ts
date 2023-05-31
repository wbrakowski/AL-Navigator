import * as vscode from 'vscode';
import * as tsl from './translationService';
import * as DocUtils from './docUtils';
import { baseAppTranslationFiles } from "../external_resources/BaseAppTranslationFiles";

export function showMicrosoftTranslation(reverse: boolean) {
  console.log('Running: showMicrosoftTranslationLocal');
  let currentWord = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";
  vscode.window.showInputBox({ value: currentWord, prompt: "Translate String:" }).then(searchString =>
    tsl.showBaseAppTranslation(searchString, reverse, true));

  console.log('Done: showMicrosoftTranslationLocal');
}

// export async function downloadBaseAppTranslationFiles(): Promise<void> {
//   console.log("Running: downloadBaseAppTranslationFiles");
//   let targetLanguageCodes: string[] = [];
//   targetLanguageCodes[0] = 'de-de';

//   try {
//     const result = await baseAppTranslationFiles.getBlobs(targetLanguageCodes);
//     let informationMessage = `Successfully downloaded ${result.succeeded.length} translation file(s).`;
//     informationMessage +=
//       result.failed.length > 0
//         ? ` Failed to download ${result.failed.length
//         } file(s): ${result.failed.join(",")}.`
//         : "";
//     vscode.window.showInformationMessage(informationMessage);
//   } catch (error) {
//     vscode.window.showErrorMessage(error.message);
//   }
//   console.log("Done: downloadBaseAppTranslationFiles");
// }
