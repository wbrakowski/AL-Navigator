import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
const AdmZip = require('adm-zip'); // For handling .app files

export async function selectStartupObjectId() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    const workspaceFolder = workspaceFolders[0].uri.fsPath;

    // Lade den App-Namen aus app.json
    const appName = getAppNameFromAppJson(workspaceFolder);

    // Zeige eine Fortschrittsanzeige
    const progressMessage = vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Loading AL Objects...',
            cancellable: false,
        },
        async (progress) => {
            try {
                progress.report({ message: 'Extracting objects from .app files...' });
                const appObjects = await extractObjectsFromAppFiles(workspaceFolder);

                progress.report({ message: 'Extracting objects from .al files...' });
                const alObjects = await extractObjectsFromAlFiles(workspaceFolder, ['page', 'report'], appName);

                progress.report({ message: 'Combining and sorting objects...' });
                const combinedObjects = [...alObjects, ...appObjects].sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'Page' ? -1 : 1; // Pages zuerst
                    }
                    return a.id - b.id; // Sortiere nach ID
                });

                if (combinedObjects.length === 0) {
                    vscode.window.showErrorMessage('No AL objects found in the workspace or .app files.');
                    return [];
                }

                return combinedObjects;
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                return [];
            }
        }
    );

    const combinedObjects = await progressMessage;

    if (combinedObjects.length === 0) {
        return;
    }

    // Zeige das Quick Pick-Menü
    const selectedObject = await vscode.window.showQuickPick(
        combinedObjects.map((obj) => ({
            label: `${obj.type} | ID: ${obj.id} | ${obj.name}`,
            detail: `App: ${obj.appName || 'Unknown'}`,
            id: obj.id,
            type: obj.type,
        })),
        { placeHolder: 'Select an object to set as the startup object (Type | ID | Name | App)' }
    );

    if (!selectedObject) {
        vscode.window.showInformationMessage('No object selected.');
        return;
    }

    // Aktualisiere die launch.json
    const launchJsonPath = path.join(workspaceFolder, '.vscode', 'launch.json');
    if (!fs.existsSync(launchJsonPath)) {
        vscode.window.showErrorMessage('launch.json file not found in the .vscode folder.');
        return;
    }

    try {
        const launchJson = await parseLaunchJsonWithComments(launchJsonPath);

        if (!launchJson.configurations || launchJson.configurations.length === 0) {
            vscode.window.showErrorMessage('No configurations found in launch.json.');
            return;
        }

        const config = launchJson.configurations[0];
        config.startupObjectId = selectedObject.id;
        config.startupObjectType = selectedObject.type;

        fs.writeFileSync(launchJsonPath, JSON.stringify(launchJson, null, 4), 'utf-8');
        vscode.window.showInformationMessage(
            `Updated startupObjectId to ${selectedObject.label} in launch.json.`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Error updating launch.json: ${error.message}`);
    }
}

function parseLaunchJsonWithComments(launchJsonPath: string): any {
    const stripJsonComments = require('strip-json-comments'); // Use require() for CommonJS
    const content = fs.readFileSync(launchJsonPath, 'utf-8');
    const sanitizedContent = stripJsonComments(content); // Remove comments
    return JSON.parse(sanitizedContent);
}

// Funktion zum Abrufen des App-Namens aus app.json
function getAppNameFromAppJson(workspaceFolder: string): string {
    const appJsonPath = path.join(workspaceFolder, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
        return 'Unknown App';
    }

    try {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
        return appJson.name || 'Unknown App';
    } catch (error) {
        console.error('Error reading app.json:', error.message);
        return 'Unknown App';
    }
}

// Extrahiert Objekte aus .app Dateien
async function extractObjectsFromAppFiles(folderPath: string): Promise<{ id: number; name: string; type: string; appName: string }[]> {
    const objects: { id: number; name: string; type: string; appName: string }[] = [];
    const appFiles = fs.readdirSync(path.join(folderPath, '.alpackages')).filter(file => file.endsWith('.app'));

    for (const file of appFiles) {
        const appFilePath = path.join(folderPath, '.alpackages', file);
        const cleanedAppFilePath = path.join(path.dirname(appFilePath), `${path.basename(appFilePath, '.app')}.zip`);

        try {
            await removeHeaderFromAppFile(appFilePath, cleanedAppFilePath);

            const zip = new AdmZip(cleanedAppFilePath);
            const entries = zip.getEntries();

            for (const entry of entries) {
                if (entry.entryName.endsWith('.al')) {
                    const content = entry.getData().toString('utf-8');
                    const matches = [
                        ...content.matchAll(/(page|report)\s+(\d+)\s+"([^"]+)"/gi)
                    ];
                    for (const match of matches) {
                        const type = match[1].toLowerCase();
                        const id = parseInt(match[2], 10);
                        const name = match[3];
                        if (!isNaN(id)) {
                            objects.push({ id, name, type: capitalize(type), appName: file });
                        }
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing .app file ${file}: ${error.message}`);
        } finally {
            // Lösche die temporäre ZIP-Datei
            if (fs.existsSync(cleanedAppFilePath)) {
                try {
                    fs.unlinkSync(cleanedAppFilePath);
                } catch (unlinkError) {
                    vscode.window.showWarningMessage(`Could not delete temporary file ${cleanedAppFilePath}: ${unlinkError.message}`);
                }
            }
        }
    }

    return objects;
}


// Extrahiert Objekte aus .al Dateien
async function extractObjectsFromAlFiles(
    folderPath: string,
    allowedTypes: string[],
    appName: string
): Promise<{ id: number; name: string; type: string; appName: string }[]> {
    const objects: { id: number; name: string; type: string; appName: string }[] = [];
    const alFiles = await vscode.workspace.findFiles('**/*.al', '**/node_modules/**');

    for (const file of alFiles) {
        const content = fs.readFileSync(file.fsPath, 'utf-8');
        const matches = [
            ...content.matchAll(/(page|report)\s+(\d+)\s+"([^"]+)"/gi)
        ];
        for (const match of matches) {
            const type = match[1].toLowerCase();
            if (allowedTypes.includes(type)) {
                const id = parseInt(match[2], 10);
                const name = match[3];
                if (!isNaN(id)) {
                    objects.push({ id, name, type: capitalize(type), appName });
                }
            }
        }
    }

    return objects;
}

// Entfernt den Header aus einer .app Datei
async function removeHeaderFromAppFile(sourceFilePath: string, targetFilePath: string): Promise<any> {
    const headerSize = 40; // Custom header size
    const util = require('util');
    const readFileAsync = util.promisify(fs.readFile);
    const writeFileAsync = util.promisify(fs.writeFile);

    const data = await readFileAsync(sourceFilePath);
    const newData = data.slice(headerSize); // Remove the header
    return writeFileAsync(targetFilePath, newData);
}

// Utility function to capitalize the first letter of a string
function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
