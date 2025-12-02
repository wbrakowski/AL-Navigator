import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFile } from '../al/alFile';
import { RecentlyUsedObjectsManager } from './recentlyUsedObjects';
const AdmZip = require('adm-zip'); // For handling .app files

// Popular Business Central objects that are frequently used as startup objects
interface PopularObject {
    id: number;
    name: string;
    type: 'Page' | 'Report';
    category: string;
}

const POPULAR_OBJECTS: PopularObject[] = [
    // Sales & Marketing
    { id: 9305, name: 'Sales Order List', type: 'Page', category: 'Sales' },
    { id: 42, name: 'Sales Order', type: 'Page', category: 'Sales' },
    { id: 9300, name: 'Sales Quote List', type: 'Page', category: 'Sales' },
    { id: 41, name: 'Sales Quote', type: 'Page', category: 'Sales' },
    { id: 9301, name: 'Sales Invoice List', type: 'Page', category: 'Sales' },
    { id: 43, name: 'Sales Invoice', type: 'Page', category: 'Sales' },
    { id: 9304, name: 'Sales Credit Memo List', type: 'Page', category: 'Sales' },
    { id: 44, name: 'Sales Credit Memo', type: 'Page', category: 'Sales' },
    { id: 22, name: 'Customer List', type: 'Page', category: 'Sales' },
    { id: 21, name: 'Customer Card', type: 'Page', category: 'Sales' },

    // Purchase
    { id: 9307, name: 'Purchase Order List', type: 'Page', category: 'Purchase' },
    { id: 50, name: 'Purchase Order', type: 'Page', category: 'Purchase' },
    { id: 9306, name: 'Purchase Quote List', type: 'Page', category: 'Purchase' },
    { id: 49, name: 'Purchase Quote', type: 'Page', category: 'Purchase' },
    { id: 9308, name: 'Purchase Invoice List', type: 'Page', category: 'Purchase' },
    { id: 51, name: 'Purchase Invoice', type: 'Page', category: 'Purchase' },
    { id: 9303, name: 'Purchase Credit Memo List', type: 'Page', category: 'Purchase' },
    { id: 52, name: 'Purchase Credit Memo', type: 'Page', category: 'Purchase' },
    { id: 27, name: 'Vendor List', type: 'Page', category: 'Purchase' },
    { id: 26, name: 'Vendor Card', type: 'Page', category: 'Purchase' },

    // Inventory
    { id: 31, name: 'Item List', type: 'Page', category: 'Inventory' },
    { id: 30, name: 'Item Card', type: 'Page', category: 'Inventory' },

    // Finance
    { id: 9027, name: 'General Ledger Entries', type: 'Page', category: 'Finance' },
    { id: 39, name: 'General Journal', type: 'Page', category: 'Finance' },
    { id: 16, name: 'Chart of Accounts', type: 'Page', category: 'Finance' },
    { id: 18, name: 'G/L Account Card', type: 'Page', category: 'Finance' },

    // Setup & Administration
    { id: 1, name: 'Company Information', type: 'Page', category: 'Setup' },
    { id: 9175, name: 'User Setup', type: 'Page', category: 'Setup' },
    { id: 672, name: 'Job Queue Entries', type: 'Page', category: 'Setup' },
    { id: 9800, name: 'Role Center (Blank)', type: 'Page', category: 'Setup' }
];

// Function to find all launch.json files in workspace
async function findAllLaunchJsonFiles(): Promise<vscode.Uri[]> {
    const launchJsonFiles = await vscode.workspace.findFiles('**/.vscode/launch.json', '**/node_modules/**');
    return launchJsonFiles;
}

// Function to select the right launch.json when multiple are found
async function selectLaunchJsonFile(launchJsonFiles: vscode.Uri[]): Promise<vscode.Uri[] | undefined> {
    if (launchJsonFiles.length === 0) {
        vscode.window.showErrorMessage('No launch.json file found in the workspace.');
        return undefined;
    }

    if (launchJsonFiles.length === 1) {
        return launchJsonFiles;
    }

    // Multiple launch.json files found, let user choose
    const options = [
        {
            label: '$(check-all) Update All launch.json Files',
            description: `Update all ${launchJsonFiles.length} launch.json files`,
            detail: 'This will update the startupObjectId in all found launch.json files',
            isAll: true,
            uris: launchJsonFiles
        },
        ...launchJsonFiles.map(file => ({
            label: `$(file) ${path.basename(path.dirname(path.dirname(file.fsPath)))}`,
            description: path.dirname(path.dirname(file.fsPath)),
            detail: file.fsPath,
            isAll: false,
            uris: [file]
        }))
    ];

    const selectedOption = await vscode.window.showQuickPick(options, {
        placeHolder: 'Multiple launch.json files found. Please select which one(s) to update:'
    });

    return selectedOption?.uris;
}

let recentlyUsedManager: RecentlyUsedObjectsManager | undefined;

export function initializeRecentlyUsedManager(context: vscode.ExtensionContext) {
    recentlyUsedManager = new RecentlyUsedObjectsManager(context);
}

export async function selectStartupObjectId() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    // Find all launch.json files in the workspace
    const launchJsonFiles = await findAllLaunchJsonFiles();
    const selectedLaunchJsons = await selectLaunchJsonFile(launchJsonFiles);

    if (!selectedLaunchJsons || selectedLaunchJsons.length === 0) {
        return;
    }

    // Determine the workspace folder for the first selected launch.json (for loading objects)
    const workspaceFolder = path.dirname(path.dirname(selectedLaunchJsons[0].fsPath));

    // Try to get the current object from active editor
    let currentObjectId: number | undefined;
    let currentObjectType: string | undefined;
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'al') {
        try {
            const alFile = new ALFile(activeEditor.document.uri);
            if (alFile.alObject.objectID &&
                (alFile.alObject.objectType === 'Page' || alFile.alObject.objectType === 'Report')) {
                currentObjectId = alFile.alObject.objectNo;
                currentObjectType = alFile.alObject.objectType;
            }
        } catch (error) {
            // Ignore errors, just won't prefilter
        }
    }

    // Load app name from app.json
    const appName = getAppNameFromAppJson(workspaceFolder);

    // Build Quick Access menu options
    const quickAccessOptions: Array<{
        label: string;
        description: string;
        detail: string;
        action: 'current' | 'recent' | 'popular' | 'all';
    }> = [];

    // Add "Current Object" option if a Page or Report is currently open
    if (currentObjectId && currentObjectType) {
        quickAccessOptions.push({
            label: `$(file) Current Object`,
            description: `${currentObjectType} ${currentObjectId}`,
            detail: 'Use the currently open Page or Report as startup object',
            action: 'current'
        });
    }

    // Add "Recently Used" option if there are recent objects
    if (recentlyUsedManager) {
        const recentObjects = recentlyUsedManager.getRecentlyUsedObjects();
        if (recentObjects.length > 0) {
            quickAccessOptions.push({
                label: `$(history) Recently Used Objects`,
                description: `${recentObjects.length} recent object${recentObjects.length > 1 ? 's' : ''}`,
                detail: 'Quick access to your recently used startup objects',
                action: 'recent'
            });
        }
    }

    // Add Popular and All options
    quickAccessOptions.push(
        {
            label: '$(star-full) Popular Objects',
            description: 'Select from commonly used Business Central pages',
            detail: 'Quickly access frequently used pages like Sales Order List, Customer List, etc.',
            action: 'popular'
        },
        {
            label: '$(list-unordered) All Objects',
            description: 'Browse all pages and reports in your workspace',
            detail: 'Search through all available AL objects from workspace and .app files',
            action: 'all'
        }
    );

    // Show Quick Access menu
    const quickAccessChoice = await vscode.window.showQuickPick(quickAccessOptions, {
        placeHolder: 'How would you like to select the startup object?'
    });

    if (!quickAccessChoice) {
        return;
    }

    let selectedObject: { label: string; id: number; type: string } | undefined;

    if (quickAccessChoice.action === 'current') {
        // Use the current object directly
        if (currentObjectId && currentObjectType) {
            selectedObject = {
                label: `${currentObjectType} | ID: ${currentObjectId}`,
                id: currentObjectId,
                type: currentObjectType
            };
        }
    } else if (quickAccessChoice.action === 'recent') {
        // Show recently used objects
        selectedObject = await showRecentlyUsedObjects();
    } else if (quickAccessChoice.action === 'popular') {
        // Show popular objects list
        selectedObject = await showPopularObjects(currentObjectId, currentObjectType);
    } else {
        // Show all objects (existing logic)
        selectedObject = await showAllObjects(workspaceFolder, appName, currentObjectId, currentObjectType);
    }

    if (!selectedObject) {
        vscode.window.showInformationMessage('No object selected.');
        return;
    }

    // Update the selected launch.json file(s)
    await updateLaunchJsonFiles(selectedLaunchJsons, selectedObject);
}

// Show recently used objects for quick selection
async function showRecentlyUsedObjects(): Promise<{ label: string; id: number; type: string } | undefined> {
    if (!recentlyUsedManager) {
        return undefined;
    }

    const recentObjects = recentlyUsedManager.getRecentlyUsedObjects();
    if (recentObjects.length === 0) {
        vscode.window.showInformationMessage('No recently used objects found.');
        return undefined;
    }

    const recentItems = recentObjects.map(obj => ({
        label: `${obj.type} | ID: ${obj.id} | ${obj.name}`,
        description: recentlyUsedManager.formatRecentlyUsedObject(obj).split(' - ')[1], // Get the time ago part
        detail: undefined,
        id: obj.id,
        type: obj.type
    }));

    return await vscode.window.showQuickPick(recentItems, {
        placeHolder: 'Select a recently used object to set as startup object'
    });
}

// Show popular Business Central objects for quick selection
async function showPopularObjects(
    currentObjectId?: number,
    currentObjectType?: string
): Promise<{ label: string; id: number; type: string } | undefined> {
    const popularItems = POPULAR_OBJECTS.map(obj => ({
        label: `${obj.type} | ID: ${obj.id} | ${obj.name}`,
        description: obj.category,
        detail: currentObjectId === obj.id && currentObjectType === obj.type ? '⭐ Current' : undefined,
        id: obj.id,
        type: obj.type
    }));

    return await vscode.window.showQuickPick(popularItems, {
        placeHolder: currentObjectId
            ? `Select a popular object (Current: ${currentObjectType} ${currentObjectId})`
            : 'Select a popular Business Central object to set as startup object'
    });
}

// Show all objects from workspace and .app files
async function showAllObjects(
    workspaceFolder: string,
    appName: string,
    currentObjectId?: number,
    currentObjectType?: string
): Promise<{ label: string; id: number; type: string } | undefined> {
    // Show progress indicator
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
                    // If we have a current object, sort it to the top
                    if (currentObjectId) {
                        const aIsCurrent = a.id === currentObjectId && a.type === currentObjectType;
                        const bIsCurrent = b.id === currentObjectId && b.type === currentObjectType;
                        if (aIsCurrent && !bIsCurrent) return -1;
                        if (!aIsCurrent && bIsCurrent) return 1;
                    }

                    if (a.type !== b.type) {
                        return a.type === 'Page' ? -1 : 1; // Pages first
                    }
                    return a.id - b.id; // Sort by ID
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
        return undefined;
    }

    // Show the Quick Pick menu
    return await vscode.window.showQuickPick(
        combinedObjects.map((obj) => ({
            label: `${obj.type} | ID: ${obj.id} | ${obj.name}`,
            detail: `App: ${obj.appName || 'Unknown'}`,
            id: obj.id,
            type: obj.type,
        })),
        {
            placeHolder: currentObjectId
                ? `Select an object (Current: ${currentObjectType} ${currentObjectId})`
                : 'Select an object to set as the startup object (Type | ID | Name | App)'
        }
    );
}

// Update all selected launch.json files with the chosen startup object
async function updateLaunchJsonFiles(
    selectedLaunchJsons: vscode.Uri[],
    selectedObject: { label: string; id: number; type: string }
): Promise<void> {
    let totalUpdated = 0;
    let totalConfigs = 0;

    for (const launchJsonUri of selectedLaunchJsons) {
        const launchJsonPath = launchJsonUri.fsPath;
        if (!fs.existsSync(launchJsonPath)) {
            vscode.window.showWarningMessage(`Launch.json file not found: ${launchJsonPath}`);
            continue;
        }

        try {
            const launchJson = await parseLaunchJsonWithComments(launchJsonPath);

            if (!launchJson.configurations || launchJson.configurations.length === 0) {
                vscode.window.showWarningMessage(`No configurations found in ${launchJsonPath}`);
                continue;
            }

            // Update all configurations in this file
            let updatedCount = 0;
            for (const config of launchJson.configurations) {
                config.startupObjectId = selectedObject.id;
                config.startupObjectType = selectedObject.type;

                // Extract and save object name
                const nameParts = selectedObject.label.split('|');
                const objectName = nameParts.length > 2 ? nameParts[2].trim() : '';
                if (objectName) {
                    config.startupObjectName = objectName;
                }

                updatedCount++;
            }

            fs.writeFileSync(launchJsonPath, JSON.stringify(launchJson, null, 4), 'utf-8');
            totalUpdated++;
            totalConfigs += updatedCount;
        } catch (error) {
            vscode.window.showErrorMessage(`Error updating ${launchJsonPath}: ${error.message}`);
        }
    }

    if (totalUpdated > 0) {
        const fileText = totalUpdated === 1 ? 'file' : 'files';
        const configText = totalConfigs === 1 ? 'configuration' : 'configurations';
        vscode.window.showInformationMessage(
            `Updated startupObjectId to ${selectedObject.label} in ${totalConfigs} ${configText} across ${totalUpdated} launch.json ${fileText}.`
        );

        // Add to recently used objects
        if (recentlyUsedManager) {
            // Extract name from label if available
            const nameParts = selectedObject.label.split('|');
            const name = nameParts.length > 2 ? nameParts[2].trim() : '';
            await recentlyUsedManager.addRecentlyUsedObject(
                selectedObject.id,
                name,
                selectedObject.type
            );
        }
    } else {
        vscode.window.showErrorMessage('Failed to update any launch.json files.');
    }
}

// function parseLaunchJsonWithComments(launchJsonPath: string): any {
//     const stripJsonComments = require('strip-json-comments'); // Use require() for CommonJS
//     const content = fs.readFileSync(launchJsonPath, 'utf-8');
//     const sanitizedContent = stripJsonComments(content); // Remove comments
//     return JSON.parse(sanitizedContent);
// }

function parseLaunchJsonWithComments(launchJsonPath: string): any {
    // const stripJsonComments = require('strip-json-comments'); // Use require() for CommonJS
    const content = fs.readFileSync(launchJsonPath, 'utf-8');
    // const sanitizedContent = stripJsonComments(content); // Remove comments
    return JSON.parse(content);
}

// Function to get the app name from app.json
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

// Extracts objects from .app files
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
            // Delete the temporary ZIP file
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


// Extracts objects from .al files
async function extractObjectsFromAlFiles(
    folderPath: string,
    allowedTypes: string[],
    appName: string
): Promise<{ id: number; name: string; type: string; appName: string }[]> {
    const objects: { id: number; name: string; type: string; appName: string }[] = [];

    // Search only in the specific folder (relative to workspace folder)
    const pattern = new vscode.RelativePattern(folderPath, '**/*.al');
    const alFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

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

// Removes the header from a .app file
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
