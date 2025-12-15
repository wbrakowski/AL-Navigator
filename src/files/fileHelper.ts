import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';

export async function createFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content);
}

export async function readFile(filePath: string): Promise<string> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf8');
}

export async function fileExists(filePath: string): Promise<boolean> {
    return fs.promises.access(filePath)
        .then(() => true)
        .catch(() => false);
}

export function ensureDirSync(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
}

export async function removeHeaderFromAppFile(sourceFilePath: string, targetFilePath: string): Promise<any> {
    const headerSize = 40;

    const util = require('util');

    const readFileAsync = util.promisify(fs.readFile);
    const writeFileAsync = util.promisify(fs.writeFile);

    const data = await readFileAsync(sourceFilePath);
    const newData = data.slice(headerSize);
    return writeFileAsync(targetFilePath, newData);
    // console.log('Header removed successfully. New ZIP file created.');
}

export async function copyReportFileToWorkspace(tempAppFilePath: string, targetFolderPath: string, sourceFileName: string, targetFileName: string): Promise<boolean> {
    const zip = new AdmZip(tempAppFilePath);
    const zipEntries = zip.getEntries();

    const util = require('util');
    const writeFileAsync = util.promisify(fs.writeFile);

    let sourceFileName2;
    if (sourceFileName.endsWith('.rdlc')) {
        sourceFileName2 = sourceFileName.replace('.rdlc', '.rdl');
    } else {
        sourceFileName2 = sourceFileName;
    }

    // Find file in archive
    for (const zipEntry of zipEntries) {
        const fileName = zipEntry.entryName.split('/').pop();
        if (fileName === sourceFileName || fileName === sourceFileName2) {
            // Copy file to target file path
            const targetFilePath = path.join(targetFolderPath, targetFileName);
            if (fs.existsSync(targetFilePath)) {
                vscode.window.showInformationMessage(`File ${targetFileName} already exists in ${targetFolderPath}.`);
            }
            else {
                await writeFileAsync(targetFilePath, zipEntry.getData());
                vscode.window.showInformationMessage(`File ${targetFileName} copied to ${targetFolderPath}.`);
            }
            return true;
        }
    }

    return false;
}/**
 * Represents a report found in an app package
 */
export interface ReportInfo {
    id: number;
    name: string;
    caption?: string; // Optional: The Caption property value (may differ from name)
    appName: string;
    appFilePath: string;
}

/**
 * Extracts all reports from .app files in the .alpackages folder
 * @param alpackagesFolderPath Path to the .alpackages folder
 * @returns Array of ReportInfo objects containing report details
 */
export async function getAllReportsFromAppFiles(alpackagesFolderPath: string): Promise<ReportInfo[]> {
    const reports: ReportInfo[] = [];
    const files = fs.readdirSync(alpackagesFolderPath);
    const appFiles = files.filter(file => file.endsWith('.app'));

    if (appFiles.length === 0) {
        return reports;
    }

    // Create a temporary folder for processing app files
    const tempFolderPath = path.join(path.dirname(alpackagesFolderPath), 'temp_app_search');
    ensureDirSync(tempFolderPath);

    try {
        // Search through each app file
        for (const appFile of appFiles) {
            const appFilePath = path.join(alpackagesFolderPath, appFile);
            const tempAppFilePath = path.join(tempFolderPath, appFile);

            try {
                // Remove header from app file to make it a valid ZIP
                await removeHeaderFromAppFile(appFilePath, tempAppFilePath);

                // Extract reports from this app
                const zip = new AdmZip(tempAppFilePath);
                const zipEntries = zip.getEntries();

                for (const zipEntry of zipEntries) {
                    if (zipEntry.entryName.endsWith('.al')) {
                        const content = zipEntry.getData().toString('utf-8');
                        // Match report declarations: report <id> "<name>"
                        const reportMatches = content.matchAll(/report\s+(\d+)\s+"([^"]+)"/gi);

                        for (const match of reportMatches) {
                            const id = parseInt(match[1], 10);
                            const name = match[2];

                            if (!isNaN(id)) {
                                // Try to extract the Caption property value
                                // Look for: Caption = 'value'; or Caption = "value";
                                // This should be within the report declaration (after the report line)
                                const reportStartIndex = match.index!;
                                const remainingContent = content.substring(reportStartIndex);

                                // Find the dataset section or first { to limit search scope
                                const datasetMatch = /dataset\s*{/i.exec(remainingContent);
                                const searchScope = datasetMatch ? remainingContent.substring(0, datasetMatch.index) : remainingContent.substring(0, 500);

                                // Match Caption property: Caption = 'text' or Caption = "text"
                                const captionMatch = /Caption\s*=\s*['"]([^'"]+)['"]/i.exec(searchScope);
                                const caption = captionMatch ? captionMatch[1] : undefined;

                                reports.push({
                                    id,
                                    name,
                                    caption,
                                    appName: appFile,
                                    appFilePath
                                });
                            }
                        }
                    }
                }

                // Clean up this temp file before checking the next app
                await fs.promises.unlink(tempAppFilePath);
            } catch (appError) {
                // Skip this app file if it's corrupted or has issues
                console.log(`Skipping ${appFile} due to error: ${appError}`);
                try {
                    await fs.promises.unlink(tempAppFilePath);
                } catch { }
                // Continue to the next app file
                continue;
            }
        }

        // Clean up temp folder
        await fs.promises.rm(tempFolderPath, { recursive: true, force: true });

        // Sort reports by ID
        reports.sort((a, b) => a.id - b.id);

        return reports;
    } catch (error) {
        // Clean up on error
        try {
            await fs.promises.rm(tempFolderPath, { recursive: true, force: true });
        } catch { }
        throw error;
    }
}

/**
 * Finds the .app file that contains the specified report
 * @param alpackagesFolderPath Path to the .alpackages folder
 * @param reportName Name of the report to find
 * @returns Path to the app file containing the report, or undefined if not found
 */
export async function findAppFileContainingReport(alpackagesFolderPath: string, reportName: string): Promise<string | undefined> {
    const files = fs.readdirSync(alpackagesFolderPath);
    const appFiles = files.filter(file => file.endsWith('.app'));

    if (appFiles.length === 0) {
        return undefined;
    }

    // Import StringFunctions to remove special chars and spaces
    const { StringFunctions } = require('../additional/stringFunctions');
    let sourceFileName = StringFunctions.removeSpecialCharsAndSpaces(reportName);

    // Remove 'KTG' suffix if present (common in some AL projects)
    if (sourceFileName.endsWith('KTG')) {
        sourceFileName = sourceFileName.slice(0, -3);
    }

    const sourceAlFileName = sourceFileName + '.Report.al';

    // Create a temporary folder for processing app files
    const tempFolderPath = path.join(path.dirname(alpackagesFolderPath), 'temp_app_search');
    ensureDirSync(tempFolderPath);

    try {
        // Search through each app file
        for (const appFile of appFiles) {
            const appFilePath = path.join(alpackagesFolderPath, appFile);
            const tempAppFilePath = path.join(tempFolderPath, appFile);

            try {
                // Remove header from app file to make it a valid ZIP
                await removeHeaderFromAppFile(appFilePath, tempAppFilePath);

                // Check if this app contains the report
                const zip = new AdmZip(tempAppFilePath);
                const zipEntries = zip.getEntries();

                for (const zipEntry of zipEntries) {
                    const fileName = zipEntry.entryName.split('/').pop();
                    if (fileName === sourceAlFileName) {
                        // Found the report! Clean up and return
                        await fs.promises.rm(tempFolderPath, { recursive: true, force: true });
                        return appFilePath;
                    }
                }

                // Clean up this temp file before checking the next app
                await fs.promises.unlink(tempAppFilePath);
            } catch (appError) {
                // Skip this app file if it's corrupted or has issues
                console.log(`Skipping ${appFile} due to error: ${appError}`);
                try {
                    await fs.promises.unlink(tempAppFilePath);
                } catch { }
                // Continue to the next app file
                continue;
            }
        }

        // Clean up temp folder if we didn't find anything
        await fs.promises.rm(tempFolderPath, { recursive: true, force: true });
        return undefined;
    } catch (error) {
        // Clean up on error
        try {
            await fs.promises.rm(tempFolderPath, { recursive: true, force: true });
        } catch { }
        throw error;
    }
}

