import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFile } from '../al/alFile';
import { RecentlyUsedObjectsManager } from './recentlyUsedObjects';
import * as jsonc from 'jsonc-parser';
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
let extensionContext: vscode.ExtensionContext | undefined;

export function initializeRecentlyUsedManager(context: vscode.ExtensionContext) {
    extensionContext = context;
    recentlyUsedManager = new RecentlyUsedObjectsManager(context);
}

// Function to save the current startup object name for status bar display
function saveCurrentStartupObjectName(id: number, type: string, name: string) {
    if (extensionContext) {
        const key = `startupObject_${id}_${type}`;
        extensionContext.globalState.update(key, name);
        // Also save the current startup object info
        extensionContext.globalState.update('currentStartupObject', { id, type, name });
    }
}

// Function to get the current startup object name for status bar display
export function getCurrentStartupObjectName(): { id: number; type: string; name: string } | undefined {
    if (extensionContext) {
        return extensionContext.globalState.get('currentStartupObject');
    }
    return undefined;
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
                const appObjects = await extractObjectsFromAppFiles(workspaceFolder, appName);

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
            const launchJson = parseLaunchJsonWithComments(launchJsonPath);

            if (!launchJson.configurations || launchJson.configurations.length === 0) {
                vscode.window.showWarningMessage(`No configurations found in ${launchJsonPath}`);
                continue;
            }

            // Update all configurations in this file
            let updatedCount = 0;
            for (const config of launchJson.configurations) {
                config.startupObjectId = selectedObject.id;
                config.startupObjectType = selectedObject.type;
                updatedCount++;
            }

            // Write file with preserved formatting and comments
            writeLaunchJsonWithFormatting(launchJsonPath, launchJson);
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

        // Extract name from label
        const nameParts = selectedObject.label.split('|');
        const name = nameParts.length > 2 ? nameParts[2].trim() : '';

        // Save current startup object name for status bar
        saveCurrentStartupObjectName(selectedObject.id, selectedObject.type, name);

        // Add to recently used objects
        if (recentlyUsedManager) {
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

/**
 * Parse a launch.json file that may contain comments.
 * Uses jsonc-parser to properly handle JSON with comments while preserving formatting.
 * Allows trailing commas and other common JSON issues.
 */
function parseLaunchJsonWithComments(launchJsonPath: string): any {
    let content = fs.readFileSync(launchJsonPath, 'utf-8');
    const parseErrors: jsonc.ParseError[] = [];

    // Parse with allowTrailingComma option for more flexibility
    let result = jsonc.parse(content, parseErrors, { allowTrailingComma: true });

    // If we got a valid result with configurations, use it even if there are minor errors
    if (result && result.configurations && Array.isArray(result.configurations) && result.configurations.length > 0) {
        if (parseErrors.length > 0) {
            console.warn(`launch.json has ${parseErrors.length} parsing issue(s), but continuing with valid result`);
        }
        return result;
    }

    if (parseErrors.length > 0) {
        // Create a more helpful error message
        const errorMessages = parseErrors.map(err => {
            const errorCode = jsonc.printParseErrorCode(err.error);
            const offset = err.offset;

            // Get context around the error (40 chars before and after)
            const start = Math.max(0, offset - 40);
            const end = Math.min(content.length, offset + 40);
            const beforeError = content.substring(start, offset);
            const atError = content.substring(offset, offset + 1);
            const afterError = content.substring(offset + 1, end);
            const context = `${beforeError}>>>${atError}<<<${afterError}`;
            const lines = content.substring(0, offset).split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;

            return `Line ${line}, Column ${column}: ${errorCode}\nContext: "${context.replace(/\n/g, '\\n').replace(/\r/g, '')}"`;
        }).join('\n\n');

        throw new Error(`Failed to parse launch.json:\n${errorMessages}\n\nPlease check your launch.json file for syntax errors (missing values, trailing commas in wrong places, etc.).`);
    }

    return result;
}/**
 * Write launch.json file while preserving formatting and comments where possible.
 * Uses jsonc-parser's edit capabilities to modify the file in place.
 */
function writeLaunchJsonWithFormatting(
    launchJsonPath: string,
    launchJson: any
): void {
    let content = fs.readFileSync(launchJsonPath, 'utf-8');

    // Apply edits incrementally to avoid overlapping edits
    if (launchJson.configurations && Array.isArray(launchJson.configurations)) {
        for (let i = 0; i < launchJson.configurations.length; i++) {
            const config = launchJson.configurations[i];

            // Update startupObjectId
            if (config.startupObjectId !== undefined) {
                const edits = jsonc.modify(
                    content,
                    ['configurations', i, 'startupObjectId'],
                    config.startupObjectId,
                    { formattingOptions: { tabSize: 4, insertSpaces: true } }
                );
                content = jsonc.applyEdits(content, edits);
            }

            // Update startupObjectType
            if (config.startupObjectType !== undefined) {
                const edits = jsonc.modify(
                    content,
                    ['configurations', i, 'startupObjectType'],
                    config.startupObjectType,
                    { formattingOptions: { tabSize: 4, insertSpaces: true } }
                );
                content = jsonc.applyEdits(content, edits);
            }
        }
    }

    // Write the final content
    fs.writeFileSync(launchJsonPath, content, 'utf-8');
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

// Interface for parsed app file information
interface AppFileInfo {
    fileName: string;
    appName: string;
    version: string;
    versionParts: number[];
}

/**
 * Parse an app filename to extract app name and version.
 * Expected format: Publisher_AppName_Version.app
 * Example: Microsoft_Base Application_24.0.0.0.app
 * Returns null if the filename doesn't match the expected pattern.
 */
function parseAppFileName(fileName: string): AppFileInfo | null {
    // Remove .app extension
    const nameWithoutExt = fileName.replace(/\.app$/i, '');
    
    // Split by underscore to get parts
    const parts = nameWithoutExt.split('_');
    
    if (parts.length < 2) {
        // If we can't parse it properly, return a basic structure
        return {
            fileName: fileName,
            appName: nameWithoutExt,
            version: '0.0.0.0',
            versionParts: [0, 0, 0, 0]
        };
    }
    
    // Last part should be the version
    const lastPart = parts[parts.length - 1];
    const versionMatch = lastPart.match(/^(\d+\.)*\d+$/);
    
    if (versionMatch) {
        // Last part is a version number
        const version = lastPart;
        const versionParts = version.split('.').map(v => parseInt(v, 10) || 0);
        
        // Everything except the last part is the app name (including publisher)
        const appName = parts.slice(0, -1).join('_');
        
        return {
            fileName: fileName,
            appName: appName,
            version: version,
            versionParts: versionParts
        };
    } else {
        // Couldn't identify version, treat entire name as app name
        return {
            fileName: fileName,
            appName: nameWithoutExt,
            version: '0.0.0.0',
            versionParts: [0, 0, 0, 0]
        };
    }
}

/**
 * Compare two version arrays.
 * Returns: 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
function compareVersions(version1: number[], version2: number[]): number {
    const maxLength = Math.max(version1.length, version2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const v1 = version1[i] || 0;
        const v2 = version2[i] || 0;
        
        if (v1 > v2) return 1;
        if (v1 < v2) return -1;
    }
    
    return 0;
}

/**
 * Filter app files based on the configured version filter setting.
 * Returns the list of app files to process.
 * @param appFiles - Array of app file names
 * @param workspaceAppName - Name of the workspace app to exclude from .alpackages
 */
function filterAppFilesByVersion(appFiles: string[], workspaceAppName: string): string[] {
    // Get the configuration setting
    const config = vscode.workspace.getConfiguration('alNavigator');
    const versionFilter = config.get<string>('appVersionFilter', 'latest');
    
    // Parse all app files
    const parsedApps = appFiles
        .map(file => parseAppFileName(file))
        .filter(info => info !== null) as AppFileInfo[];
    
    // Filter out workspace app from .alpackages (developer's own app)
    const filteredParsedApps = parsedApps.filter(appInfo => {
        // Check if this app matches the workspace app name
        // The app name in the file includes publisher, but app.json might only have the app name
        // So we check if the workspace app name is contained in the parsed app name
        return !appInfo.appName.includes(workspaceAppName) && !workspaceAppName.includes(appInfo.appName);
    });
    
    if (versionFilter === 'all') {
        // Return all app files (except workspace app)
        return filteredParsedApps.map(info => info.fileName);
    }
    
    // Group by app name
    const appGroups = new Map<string, AppFileInfo[]>();
    
    for (const appInfo of filteredParsedApps) {
        const existing = appGroups.get(appInfo.appName) || [];
        existing.push(appInfo);
        appGroups.set(appInfo.appName, existing);
    }
    
    // For each app, keep only the latest version
    const filteredFiles: string[] = [];
    
    for (const [appName, versions] of appGroups) {
        if (versions.length === 1) {
            filteredFiles.push(versions[0].fileName);
        } else {
            // Sort by version (descending) and take the first one
            versions.sort((a, b) => compareVersions(b.versionParts, a.versionParts));
            filteredFiles.push(versions[0].fileName);
        }
    }
    
    return filteredFiles;
}

// Extracts objects from .app files
async function extractObjectsFromAppFiles(folderPath: string, workspaceAppName: string): Promise<{ id: number; name: string; type: string; appName: string }[]> {
    const objects: { id: number; name: string; type: string; appName: string }[] = [];
    const allAppFiles = fs.readdirSync(path.join(folderPath, '.alpackages')).filter(file => file.endsWith('.app'));
    
    // Filter app files based on version setting and exclude workspace app
    const appFiles = filterAppFilesByVersion(allAppFiles, workspaceAppName);

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
