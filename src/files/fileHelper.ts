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
        // console.log(fileName);
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
}

