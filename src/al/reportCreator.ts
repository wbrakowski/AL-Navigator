import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { ALFiles } from './alFiles';
import { ObjectTypes } from './objectTypes';
import * as AdmZip from 'adm-zip';
import { getActiveWorkspacePath, stripReportFolder } from '../additional/folderAndFileHelper';
import { StringFunctions } from '../additional/stringFunctions';
import { reportTextBuilder } from '../document/reportTextBuilder';

export class ReportCreator {
    static async startCreateReportDialog(_alFiles: ALFiles) {
        let option1 = 'Copy report including layout';
        let option2 = 'Create report extension including layout';
        let creationOptions: string[] = [];
        creationOptions[0] = option1;
        creationOptions[1] = option2;
        let selectedOption = await vscode.window.showQuickPick(creationOptions, {
            placeHolder: `Select the desired operation`
        });
        if (selectedOption) {
            switch (selectedOption) {
                case option1:
                    this.copyReport(_alFiles, false);
                    break;
                case option2:
                    this.copyReport(_alFiles, true);
                    break;
                default:
                    console.log('You shall not slay the dragons');
            }
        }
    }

    static async copyReport(_alFiles: ALFiles, createExtension: boolean) {
        let reportName = await ReportCreator.selectReport(_alFiles);
        this.copyReportToWorkspace(reportName, createExtension);
    }

    static async createReportExtensionFile(reportName: string, rdlcFileName: string, wordFileName: string) {
        if (reportName === '') {
            return;
        }

        let activeWorkSpaceFolder = getActiveWorkspacePath();
        if (activeWorkSpaceFolder === '') {
            return;
        }

        // Find the report folder if exists
        let reportFolder = this.findReportFolder(activeWorkSpaceFolder);
        if (reportFolder === '') {
            reportFolder = activeWorkSpaceFolder;
        }

        // Set file path and file content
        const fileExtension = '.al';
        const fileName = StringFunctions.removeSpecialCharsAndSpaces(reportName) + '.report';
        let reportFolderShort = stripReportFolder(reportFolder);
        const fileContent = reportTextBuilder.getReportExtensionFileContent(reportName, rdlcFileName, wordFileName, reportFolderShort);
        const filePath = path.join(reportFolder, fileName + fileExtension);

        try {
            await fs.promises.writeFile(filePath, fileContent);
            vscode.window.showInformationMessage(`File ${fileName}${fileExtension} created in folder ${reportFolder}.`);
        } catch (error) {
            console.error('Error creating file:', error);
            vscode.window.showErrorMessage('Failed to create file.');
        }
    }

    private static async selectReport(_alFiles: ALFiles): Promise<string> {
        await _alFiles.fillObjects();
        let reports = _alFiles.getObjectList(ObjectTypes.report);
        // let reports = _alFiles.getReportList();
        let reportName = await vscode.window.showQuickPick(reports, {
            placeHolder: `Select the report`
        });
        if (reportName) {
            return reportName;
        }
        else {
            return '';
        }
    }

    static async copyReportToWorkspace(reportName: string, createExtension: boolean) {
        if (reportName === '') {
            return;
        }

        let activeWorkSpaceFolder = getActiveWorkspacePath();
        if (activeWorkSpaceFolder === '') {
            vscode.window.showInformationMessage('No active workspace folder found.');
            return;
        }

        const alpackagesFolderPath = path.join(activeWorkSpaceFolder, '.alpackages');

        // Check if the alpackages folder exists
        if (!fs.existsSync(alpackagesFolderPath)) {
            vscode.window.showInformationMessage(`No .alpackages folder found in ${activeWorkSpaceFolder}.`);
            return;
        }

        // Find the report folder
        let reportFolder = this.findReportFolder(activeWorkSpaceFolder);
        if (reportFolder === '') {
            reportFolder = activeWorkSpaceFolder;
        }

        // Find all app files
        const files = fs.readdirSync(alpackagesFolderPath);
        const appFiles = files.filter(file => file.endsWith('.app'));

        if (appFiles.length === 0) {
            vscode.window.showInformationMessage(`No app files found in the .alpackages folder of ${activeWorkSpaceFolder}.`);
            return;
        }
        let appFilePath;
        let appFileName;
        const appQuickPickList = appFiles.map(appFile => ({ label: appFile }));

        // Let user select app file

        let selectedApp = await vscode.window.showQuickPick(appQuickPickList, {
            placeHolder: `Select the app that contains the layout`
        });
        if (selectedApp) {
            appFilePath = alpackagesFolderPath + '/' + selectedApp.label;
            appFileName = selectedApp.label;
        } else {
            return;
        }

        // Create a temporary folder path for extracting the file
        let tempFolderPath = path.join(activeWorkSpaceFolder, 'temp');

        // Ensure the temporary folder exists
        fsExtra.ensureDirSync(tempFolderPath);

        // Copy the .app file to the temporary folder
        const tempAppFilePath = path.join(tempFolderPath, appFileName);


        const headerSize = 40;

        const util = require('util');

        const readFileAsync = util.promisify(fs.readFile);
        const writeFileAsync = util.promisify(fs.writeFile);

        // Asynchronously remove the header from the .app file and create a new ZIP file without the 40 bytes at the start of the file
        (async () => {
            try {
                const data = await readFileAsync(appFilePath);
                const newData = data.slice(headerSize);
                await writeFileAsync(tempAppFilePath, newData);
                console.log('Header removed successfully. New ZIP file created.');
                let fileName = StringFunctions.removeSpecialCharsAndSpaces(reportName);
                let alFileName = fileName + '.Report.al';
                let rdlcFileName = fileName + '.rdlc';
                let wordFileName = fileName + '.docx';

                let alFileExists;
                if (!createExtension) {
                    alFileExists = await ReportCreator.copyReportFileToWorkspace(tempAppFilePath, reportFolder, writeFileAsync, alFileName);
                }
                let rdlcFileExists = await ReportCreator.copyReportFileToWorkspace(tempAppFilePath, reportFolder, writeFileAsync, rdlcFileName);
                let wordFileExists = await ReportCreator.copyReportFileToWorkspace(tempAppFilePath, reportFolder, writeFileAsync, wordFileName);

                if (!alFileExists && !rdlcFileExists && !wordFileExists) {
                    vscode.window.showInformationMessage(`No report file found in ${appFilePath}.`);
                }

                if (createExtension) {
                    if (!rdlcFileExists) {
                        rdlcFileName = '';
                    }
                    if (!wordFileExists) {
                        wordFileName = '';
                    }
                    await ReportCreator.createReportExtensionFile(reportName, rdlcFileName, wordFileName);
                }

                // Delete the temp folder
                await fsExtra.remove(tempFolderPath, (err) => {
                    if (err) {
                        console.error(`Error deleting temp folder: ${err}`);
                        return;
                    }
                    // console.log('Temp folder deleted.');
                });
            } catch (err) {
                console.error('Error:', err);
            }
        })();
    }

    private static async copyReportFileToWorkspace(tempAppFilePath: string, targetFolderPath: string, writeFileAsync: any, fileName: string): Promise<boolean> {
        const zip = new AdmZip(tempAppFilePath);
        const zipEntries = zip.getEntries();

        // Find file in archive
        for (const zipEntry of zipEntries) {
            if (zipEntry.entryName.endsWith(fileName)) {
                // Copy file to target file path
                const targetFilePath = path.join(targetFolderPath, fileName);
                if (fs.existsSync(targetFilePath)) {
                    vscode.window.showInformationMessage(`File ${fileName} already exists in ${targetFolderPath}.`);
                }
                else {
                    await writeFileAsync(targetFilePath, zipEntry.getData());
                    vscode.window.showInformationMessage(`File ${fileName} copied to ${targetFolderPath}.`);
                }
                return true;
            }
        }
        return false;
    }

    static findReportFolder(folderPath): string {
        // Check if the current folder contains a "report" folder
        const reportFolderPath = `${folderPath}\\report`;
        if (fs.existsSync(reportFolderPath)) {
            return reportFolderPath.replace(/\//g, '\\');
        }

        // Read the contents of the current folder
        const contents = fs.readdirSync(folderPath);

        // Search for "report" folder recursively in subfolders
        for (const item of contents) {
            const itemPath = `${folderPath}/${item}`;
            if (fs.lstatSync(itemPath).isDirectory()) {
                const foundPath = this.findReportFolder(itemPath);
                if (foundPath) {
                    return foundPath;
                }
            }
        }
        return ''; // Report folder not found
    }
}






