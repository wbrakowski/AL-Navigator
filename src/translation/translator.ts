import * as vscode from 'vscode';
import * as tsl from './translationService';
import * as DocUtils from '../document/docUtils';
import { baseAppTranslationFiles } from "../external_resources/BaseAppTranslationFiles";

export async function showMicrosoftTranslation(reverse: boolean) {
  console.log('Running: showMicrosoftTranslationLocal');
  let currentWord = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";
  // Replace two single apostrophes with one
  currentWord = currentWord.replace(/''/g, "'");

  try {
    const searchString = await vscode.window.showInputBox({ value: currentWord, prompt: "Translate String:" });
    if (searchString !== undefined) {
      await tsl.showBaseAppTranslation(searchString, reverse, true, false);
    }
  } catch (error) {
    console.error('Error in showMicrosoftTranslation:', error);
    throw error; // Re-throw to be caught by trackCommandExecution
  }

  console.log('Done: showMicrosoftTranslationLocal');
}


export async function translateAndCopyToClipboard(reverse: boolean) {
  console.log('Running: translateAndCopyToClipboard');
  let currentWord = vscode.window.activeTextEditor ? DocUtils.getSelectedWord(vscode.window.activeTextEditor) : "";

  try {
    const searchString = await vscode.window.showInputBox({ value: currentWord, prompt: "Translate and copy translation for string:" });
    if (searchString !== undefined) {
      await tsl.showBaseAppTranslation(searchString, reverse, true, true);
    }
  } catch (error) {
    console.error('Error in translateAndCopyToClipboard:', error);
    throw error; // Re-throw to be caught by trackCommandExecution
  }

  console.log('Done: translateAndCopyToClipboard');
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
