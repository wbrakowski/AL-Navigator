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

    // Step 1: Extract objects from .app files
    const appObjects = await extractObjectsFromAppFiles(workspaceFolder);

    // Step 2: Extract objects from .al files
    const alObjects = await extractObjectsFromAlFiles(workspaceFolder, ['page', 'report']);

    // Step 3: Combine objects
    const combinedObjects = [...alObjects, ...appObjects];

    if (combinedObjects.length === 0) {
        vscode.window.showErrorMessage('No AL objects found in the workspace or .app files.');
        return;
    }

    // Step 4: Show the Quick Pick menu
    const selectedObject = await vscode.window.showQuickPick(
        combinedObjects.map(obj => ({
            label: obj.name,
            detail: `ID: ${obj.id}`,
            description: `Type: ${obj.type}`,
            id: obj.id,
            type: obj.type
        })),
        { placeHolder: 'Select an object to set as the startup object (Name | ID | Type)' }
    );

    if (!selectedObject) {
        vscode.window.showInformationMessage('No object selected.');
        return;
    }

    // Step 5: Update launch.json
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
        config.startupObjectType = selectedObject.type; // Optional: Update the type

        fs.writeFileSync(launchJsonPath, JSON.stringify(launchJson, null, 4), 'utf-8');
        vscode.window.showInformationMessage(
            `Updated startupObjectId to ${selectedObject.id} (${selectedObject.label}) in launch.json.`
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


async function extractObjectsFromAppFiles(folderPath: string): Promise<{ id: number; name: string; type: string }[]> {
    const objects: { id: number; name: string; type: string }[] = [];
    const appFiles = fs.readdirSync(path.join(folderPath, '.alpackages')).filter(file => file.endsWith('.app'));

    for (const file of appFiles) {
        try {
            const appFilePath = path.join(folderPath, '.alpackages', file);
            const cleanedAppFilePath = path.join(path.dirname(appFilePath), `${path.basename(appFilePath, '.app')}.zip`);

            // Remove the custom header
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
                            objects.push({ id, name, type: capitalize(type) });
                        }
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing .app file ${file}: ${error.message}`);
        }
    }

    return objects;
}

// Function to remove the custom header from .app files
async function removeHeaderFromAppFile(sourceFilePath: string, targetFilePath: string): Promise<any> {
    const headerSize = 40; // Custom header size
    const util = require('util');
    const readFileAsync = util.promisify(fs.readFile);
    const writeFileAsync = util.promisify(fs.writeFile);

    const data = await readFileAsync(sourceFilePath);
    const newData = data.slice(headerSize); // Remove the header
    return writeFileAsync(targetFilePath, newData);
}

// Function to extract objects from .al files
async function extractObjectsFromAlFiles(
    folderPath: string,
    allowedTypes: string[]
): Promise<{ id: number; name: string; type: string }[]> {
    const objects: { id: number; name: string; type: string }[] = [];
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
                    objects.push({ id, name, type: capitalize(type) });
                }
            }
        }
    }

    return objects;
}

// Utility function to capitalize the first letter of a string
function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
