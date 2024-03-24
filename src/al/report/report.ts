import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFiles } from '../alFiles';
import { ObjectTypes } from '../objectTypes';
import * as FileHelper from '../../files/fileHelper';
import * as FolderHelper from '../../files/folderHelper';
import { StringFunctions } from '../../additional/stringFunctions';
import { reportTextBuilder } from './reportTextBuilder';
import { ALCodeOutlineExtension } from '../../al_code_outline/devToolsExtensionContext';
import { getActiveWorkspacePath, stripReportFolder } from '../../files/folderHelper';
import * as fsExtra from 'fs-extra';

export class Report {
  constructor(private alFiles: ALFiles) { }

  static async selectReport(alFiles: ALFiles): Promise<string | undefined> {
    await alFiles.fillObjects();
    const reports = alFiles.getObjectList(ObjectTypes.report);

    const reportName = await vscode.window.showQuickPick(reports, {
      placeHolder: 'Select the report',
    });

    return reportName;
  }


  async copyReportToWorkspace(reportName: string, createExtension: boolean) {
    if (!reportName) {
      return;
    }

    const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();

    if (!activeWorkspaceFolder) {
      vscode.window.showInformationMessage('No active workspace folder found.');
      return;
    }

    const alpackagesFolderPath = FolderHelper.getAlPackagesFolder(activeWorkspaceFolder);

    // Check if the alpackages folder exists
    if (!alpackagesFolderPath) {
      vscode.window.showInformationMessage(`No .alpackages folder found in ${activeWorkspaceFolder}.`);
      return;
    }

    // Find the report folder
    let reportFolder = FolderHelper.findReportFolder(activeWorkspaceFolder);
    if (!reportFolder) {
      reportFolder = activeWorkspaceFolder;
    }

    const objectName = await this.promptForObjectName(reportName);
    if (objectName === '') {
      return;
    }
    const objectID = await this.getFirstSuggestedReportId();

    // Find all app files
    const files = fs.readdirSync(alpackagesFolderPath);
    const appFiles = files.filter(file => file.endsWith('.app'));

    if (appFiles.length === 0) {
      vscode.window.showInformationMessage(`No app files found in the .alpackages folder of ${activeWorkspaceFolder}.`);
      return;
    }

    let appFilePath: string | undefined;
    let appFileName: string | undefined;
    const appQuickPickList = appFiles.map(appFile => ({ label: appFile }));

    // Let user select app file
    const selectedApp = await vscode.window.showQuickPick(appQuickPickList, {
      placeHolder: `Select the app that contains the layout`
    });

    if (selectedApp) {
      appFilePath = path.join(alpackagesFolderPath, selectedApp.label);
      appFileName = selectedApp.label;
    } else {
      return;
    }

    if (!appFilePath) {
      return;
    }

    // Create a temporary folder path for extracting the file
    const tempFolderPath = path.join(activeWorkspaceFolder, 'temp');
    FileHelper.ensureDirSync(tempFolderPath);

    const tempAppFilePath = path.join(tempFolderPath, path.basename(appFilePath));

    await FileHelper.removeHeaderFromAppFile(appFilePath, tempAppFilePath);

    let sourceFileName = StringFunctions.removeSpecialCharsAndSpaces(reportName);
    let targetFileName = StringFunctions.removeSpecialCharsAndSpaces(objectName);

    if (sourceFileName.endsWith('KTG')) {
      sourceFileName = sourceFileName.slice(0, -3);
    }
    
    let sourceAlFileName = sourceFileName + '.Report.al';
    let targetAlFileName = targetFileName + '.Report.al';
    let sourceRdlcFileName = sourceFileName + '.rdlc';
    let targetRdlcFileName = targetFileName + '.rdlc';
    let sourceWordFileName = sourceFileName + '.docx';
    let targetWordFileName = targetFileName + '.docx';

    try {
      let alFileExists = false;

      if (!createExtension) {
        alFileExists = await FileHelper.copyReportFileToWorkspace(
          tempAppFilePath,
          reportFolder,
          sourceAlFileName,
          targetAlFileName
        );

        if (alFileExists) {
          // Change the object name in the copied report to the name that the user selected
          if (objectName !== reportName || objectID !== 0) {
            const alFilePath = path.join(reportFolder, targetAlFileName);
            const document = await vscode.workspace.openTextDocument(alFilePath);




            let targetLineIndex = -1;
            let updatedLine: string;
            let copiedReportId: string | null = null;
            let objectIdLineIdx;
            let originalText;
            let objectIdLine;


            if (objectID !== 0) {
              // Search for a number in the first 40 lines
              for (let i = 0; i < 40; i++) {
                const line = document.lineAt(i);
                const originalText = line.text;
                const numberMatch = originalText.match(/\d+/);
                if (numberMatch) {
                  copiedReportId = numberMatch[0];
                  // Search for a number in the line and replace it with `objectID`.
                  updatedLine = originalText.replace(/\d+/, objectID.toString());
                  objectIdLineIdx = i;
                  break;
                }
              }

              objectIdLine = document.lineAt(objectIdLineIdx);
              originalText = objectIdLine.text;


              // Add info from which report this report was copied
              for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
                const lineText = document.lineAt(lineIndex).text;
                if (lineText.includes('{')) {
                  targetLineIndex = lineIndex;
                  break;
                }
              }

              if (targetLineIndex !== -1) {
                const copiedFromReportLine = targetLineIndex + 1;
                const copiedFromReportText = `// Copied from report ${copiedReportId}: "${reportName}"`;
                const copiedFromReportLineText = copiedFromReportText + `\n`;

                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, new vscode.Position(copiedFromReportLine, 0), copiedFromReportLineText);
                await vscode.workspace.applyEdit(edit);
                await document.save();
              }
            } else {
              updatedLine = originalText;
            }

            if (objectName !== reportName) {
              const updatedLine2 = updatedLine.replace(/"(.*?)"/, `"${objectName}"`);
              updatedLine = updatedLine2;
            }

            // TextEdit for changes
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, objectIdLine.range, updatedLine);

            // Apply the change and save the file
            await vscode.workspace.applyEdit(edit);
            await document.save();

            const reportFolderShort = stripReportFolder(reportFolder);
            const newRdlcProperty = reportTextBuilder.getRDLCLayoutBlock(targetRdlcFileName, reportFolderShort);

            // Search for the line that contains the text "RDLCLayout ="
            targetLineIndex = -1;
            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
              const lineText = document.lineAt(lineIndex).text;
              if (lineText.includes('RDLCLayout =')) {
                targetLineIndex = lineIndex;
                break;
              }
            }

            if (targetLineIndex !== -1) {
              // Update the line with the variable value and add a tab at the beginning
              const originalLine = document.lineAt(targetLineIndex);
              const updatedLine = `\t${newRdlcProperty}`;

              // TextEdit for the change
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, originalLine.range, updatedLine);

              // Apply the change and save the file
              await vscode.workspace.applyEdit(edit);
              await document.save();
            }

            const newWordProperty = reportTextBuilder.getWordLayoutBlock(targetWordFileName, reportFolderShort);

            // Search for the line that contains the text "WordLayout ="
            targetLineIndex = -1;
            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
              const lineText = document.lineAt(lineIndex).text;
              if (lineText.includes('WordLayout =')) {
                targetLineIndex = lineIndex;
                break;
              }
            }

            if (targetLineIndex !== -1) {
              // Update the line with the variable value and add a tab at the beginning
              const originalLine = document.lineAt(targetLineIndex);
              const updatedLine = `\t${newWordProperty}`;

              // TextEdit for the change
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, originalLine.range, updatedLine);

              // Apply the change and save the file
              await vscode.workspace.applyEdit(edit);
              await document.save();
            }
          }
        }
      }

      let rdlcFileExists = await FileHelper.copyReportFileToWorkspace(
        tempAppFilePath,
        reportFolder,
        sourceRdlcFileName,
        targetRdlcFileName
      );

      let wordFileExists = await FileHelper.copyReportFileToWorkspace(
        tempAppFilePath,
        reportFolder,
        sourceWordFileName,
        targetWordFileName
      );

      if (!alFileExists && !rdlcFileExists && !wordFileExists) {
        vscode.window.showInformationMessage(`No report file found in ${appFilePath}.`);
      }

      if (createExtension) {
        if (!rdlcFileExists) {
          targetRdlcFileName = '';
        }
        if (!wordFileExists) {
          targetWordFileName = '';
        }
        await Report.createReportExtensionFile(reportName, objectID, objectName, targetRdlcFileName, targetWordFileName);
      }

      // Delete the temp folder
      await fsExtra.remove(tempFolderPath);

    } catch (err) {
      console.error('Error:', err);
    }
  }





  private async promptForObjectName(reportName: string): Promise<string> {
    const objectName = await vscode.window.showInputBox({
      prompt: `Enter a name for the report object '${reportName}':`,
      value: reportName,
      validateInput: this.validateObjectName,
    });

    return objectName || '';
  }

  private validateObjectName(objectName: string): string | null {
    if (!objectName || objectName.trim().length === 0) {
      return 'Object name cannot be empty.';
    }

    return null;
  }



  async getFirstSuggestedReportId(): Promise<number> {
    return ALCodeOutlineExtension.getFirstSuggestedReportId();
  }

  static async createReportExtensionFile(reportName: string, objectId: number, objectName: string, rdlcFileName: string, wordFileName: string) {
    if (reportName === '') {
      return;
    }

    let activeWorkSpaceFolder = getActiveWorkspacePath();
    if (activeWorkSpaceFolder === '') {
      return;
    }

    // Find the report folder if exists
    let reportFolder = FolderHelper.findReportFolder(activeWorkSpaceFolder);
    if (reportFolder === '' || reportFolder === undefined) {
      reportFolder = activeWorkSpaceFolder;
    }

    // Set file path and file content
    const fileExtension = '.al';
    const fileName = StringFunctions.removeSpecialCharsAndSpaces(objectName) + '.report';
    let reportFolderShort = stripReportFolder(reportFolder);
    const fileContent = reportTextBuilder.getReportExtensionFileContent(reportName, objectName, objectId, rdlcFileName, wordFileName, reportFolderShort);
    const filePath = path.join(reportFolder, fileName + fileExtension);

    try {
      await fs.promises.writeFile(filePath, fileContent);
      vscode.window.showInformationMessage(`File ${fileName}${fileExtension} created in folder ${reportFolder}.`);
    } catch (error) {
      console.error('Error creating file:', error);
      vscode.window.showErrorMessage('Failed to create file.');
    }
  }
}