import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFile } from '../al/alFile';
import { RecentlyUsedObjectsManager } from './recentlyUsedObjects';
import * as jsonc from 'jsonc-parser';
import { CustomConsole } from '../additional/console';
import { getAlPackagesFolder } from '../files/folderHelper';
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

    // Step 1: Determine the workspace folder for loading objects
    const workspaceFolder = workspaceFolders[0].uri.fsPath;

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

    // Step 2: Select which launch.json file(s) to update (or auto-select all if setting is enabled)
    const config = vscode.workspace.getConfiguration('alNavigator');
    const updateAllLaunchJsons = config.get<boolean>('updateAllLaunchJsons', false);

    const launchJsonFiles = await findAllLaunchJsonFiles();
    let selectedLaunchJsons: vscode.Uri[];

    if (updateAllLaunchJsons) {
        // Auto-select all launch.json files
        selectedLaunchJsons = launchJsonFiles;
        CustomConsole.customConsole.appendLine(`[AL Navigator] updateAllLaunchJsons=true, auto-selecting all ${launchJsonFiles.length} launch.json file(s)`);
    } else {
        // Let user select which launch.json files to update
        const selected = await selectLaunchJsonFile(launchJsonFiles);
        if (!selected || selected.length === 0) {
            return;
        }
        selectedLaunchJsons = selected;
    }

    // Step 3: Check configuration setting and determine which configurations to update
    const updateAllConfigs = config.get<boolean>('updateAllLaunchConfigurations', true);

    let configurationsToUpdateMap: Map<string, number[]> = new Map();

    if (!updateAllConfigs) {
        // Collect all configurations from all launch.json files
        const allConfigsInfo: Array<{
            launchJsonPath: string;
            configIndex: number;
            config: any;
            hasMultipleConfigs: boolean;
        }> = [];

        for (const launchJsonUri of selectedLaunchJsons) {
            const launchJsonPath = launchJsonUri.fsPath;
            if (!fs.existsSync(launchJsonPath)) {
                continue;
            }

            try {
                const launchJson = parseLaunchJsonWithComments(launchJsonPath);
                if (!launchJson.configurations || launchJson.configurations.length === 0) {
                    continue;
                }

                const hasMultiple = launchJson.configurations.length > 1;
                launchJson.configurations.forEach((config: any, index: number) => {
                    allConfigsInfo.push({
                        launchJsonPath,
                        configIndex: index,
                        config,
                        hasMultipleConfigs: hasMultiple
                    });
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error reading ${launchJsonPath}: ${error.message}`);
                return;
            }
        }

        // Show unified selection dialog if there are configurations to select
        if (allConfigsInfo.length > 0) {
            const selectedConfigs = await selectAllLaunchConfigurations(allConfigsInfo);
            if (!selectedConfigs || selectedConfigs.size === 0) {
                vscode.window.showInformationMessage('No configurations selected for update.');
                return;
            }
            configurationsToUpdateMap = selectedConfigs;
        }
    }

    // Step 4: Update the selected launch.json file(s)
    await updateLaunchJsonFiles(selectedLaunchJsons, selectedObject, configurationsToUpdateMap);
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
    selectedObject: { label: string; id: number; type: string },
    configurationsToUpdateMap?: Map<string, number[]>
): Promise<void> {
    let totalUpdated = 0;
    let totalConfigs = 0;

    CustomConsole.customConsole.appendLine(`[AL Navigator] ========================================`);
    CustomConsole.customConsole.appendLine(`[AL Navigator] updateLaunchJsonFiles called`);
    CustomConsole.customConsole.appendLine(`[AL Navigator] Selected object: ${selectedObject.label} (ID: ${selectedObject.id}, Type: ${selectedObject.type})`);
    CustomConsole.customConsole.appendLine(`[AL Navigator] Number of launch.json files: ${selectedLaunchJsons.length}`);

    // Get the configuration setting
    const config = vscode.workspace.getConfiguration('alNavigator');
    const updateAllConfigs = config.get<boolean>('updateAllLaunchConfigurations', true);
    CustomConsole.customConsole.appendLine(`[AL Navigator] updateAllLaunchConfigurations setting: ${updateAllConfigs}`);

    for (const launchJsonUri of selectedLaunchJsons) {
        const launchJsonPath = launchJsonUri.fsPath;
        CustomConsole.customConsole.appendLine(`[AL Navigator] Processing: ${launchJsonPath}`);

        if (!fs.existsSync(launchJsonPath)) {
            const msg = `Launch.json file not found: ${launchJsonPath}`;
            CustomConsole.customConsole.appendLine(`[AL Navigator] WARNING: ${msg}`);
            vscode.window.showWarningMessage(msg);
            continue;
        }

        try {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Parsing launch.json...`);
            const launchJson = parseLaunchJsonWithComments(launchJsonPath);
            CustomConsole.customConsole.appendLine(`[AL Navigator] Parsed successfully. Configurations found: ${launchJson.configurations?.length || 0}`);

            CustomConsole.customConsole.appendLine(`[AL Navigator] Parsed successfully. Configurations found: ${launchJson.configurations?.length || 0}`);

            if (!launchJson.configurations || launchJson.configurations.length === 0) {
                const msg = `No configurations found in ${launchJsonPath}`;
                CustomConsole.customConsole.appendLine(`[AL Navigator] WARNING: ${msg}`);
                vscode.window.showWarningMessage(msg);
                continue;
            }

            let configurationsToUpdate: number[] = [];

            // Check if configurations were already selected
            if (configurationsToUpdateMap && configurationsToUpdateMap.has(launchJsonPath)) {
                // Use the pre-selected configurations
                configurationsToUpdate = configurationsToUpdateMap.get(launchJsonPath)!;
                CustomConsole.customConsole.appendLine(`[AL Navigator] Using pre-selected configurations: ${configurationsToUpdate.join(', ')}`);
            } else if (updateAllConfigs) {
                // Setting says to update all configurations
                configurationsToUpdate = launchJson.configurations.map((_, index) => index);
                CustomConsole.customConsole.appendLine(`[AL Navigator] updateAllConfigs=true, selecting all configurations: ${configurationsToUpdate.join(', ')}`);
            } else {
                // If we get here, it means updateAllConfigs is false but no configurations were pre-selected
                // This can happen if the launch.json has only one configuration (auto-selected)
                // or if this launch.json wasn't in the original selection
                configurationsToUpdate = launchJson.configurations.map((_, index) => index);
                CustomConsole.customConsole.appendLine(`[AL Navigator] No pre-selection, defaulting to all configurations: ${configurationsToUpdate.join(', ')}`);
            }

            // Update selected configurations
            let updatedCount = 0;
            CustomConsole.customConsole.appendLine(`[AL Navigator] Updating configuration objects in memory...`);
            for (const configIndex of configurationsToUpdate) {
                const configName = launchJson.configurations[configIndex]?.name || `Index ${configIndex}`;
                CustomConsole.customConsole.appendLine(`[AL Navigator]   Config ${configIndex} (${configName}): Setting startupObjectId=${selectedObject.id}, startupObjectType=${selectedObject.type}`);
                launchJson.configurations[configIndex].startupObjectId = selectedObject.id;
                launchJson.configurations[configIndex].startupObjectType = selectedObject.type;
                updatedCount++;
            }
            CustomConsole.customConsole.appendLine(`[AL Navigator] Memory updates complete. Calling writeLaunchJsonWithFormatting...`);

            // Write file with preserved formatting and comments
            writeLaunchJsonWithFormatting(launchJsonPath, launchJson, configurationsToUpdate);

            CustomConsole.customConsole.appendLine(`[AL Navigator] Write completed successfully for ${launchJsonPath}`);
            totalUpdated++;
            totalConfigs += updatedCount;
        } catch (error) {
            const errorMsg = `Error updating ${launchJsonPath}: ${error.message}`;
            CustomConsole.customConsole.appendLine(`[AL Navigator] ❌ ERROR: ${errorMsg}`);
            CustomConsole.customConsole.appendLine(`[AL Navigator] Stack trace: ${error.stack}`);
            vscode.window.showErrorMessage(errorMsg);
        }
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] ========================================`);
    CustomConsole.customConsole.appendLine(`[AL Navigator] Update complete. Total files updated: ${totalUpdated}, Total configurations: ${totalConfigs}`);

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

// Select which launch configurations to update (unified dialog for all launch.json files)
async function selectAllLaunchConfigurations(
    allConfigsInfo: Array<{
        launchJsonPath: string;
        configIndex: number;
        config: any;
        hasMultipleConfigs: boolean;
    }>
): Promise<Map<string, number[]> | undefined> {
    interface ConfigQuickPickItem extends vscode.QuickPickItem {
        launchJsonPath: string;
        configIndex: number;
    }

    // Group by launch.json file for better display
    const launchJsonGroups = new Map<string, typeof allConfigsInfo>();
    for (const info of allConfigsInfo) {
        if (!launchJsonGroups.has(info.launchJsonPath)) {
            launchJsonGroups.set(info.launchJsonPath, []);
        }
        launchJsonGroups.get(info.launchJsonPath)!.push(info);
    }

    const options: ConfigQuickPickItem[] = [];

    // Build options with separators for each launch.json file
    for (const [launchJsonPath, configs] of launchJsonGroups.entries()) {
        const folderName = path.basename(path.dirname(path.dirname(launchJsonPath)));

        // Add configurations from this launch.json
        configs.forEach((info, localIndex) => {
            const label = info.config.name || `Configuration ${info.configIndex + 1}`;
            const description = configs.length > 1
                ? `${info.config.server || 'Local'} - ${info.config.serverInstance || 'N/A'}`
                : `${folderName} - ${info.config.server || 'Local'}`;

            options.push({
                label: configs.length > 1 ? `  ${label}` : label, // Indent if multiple configs in same file
                description,
                detail: `${folderName}/${path.basename(launchJsonPath)} - Type: ${info.config.type || 'al'}, Auth: ${info.config.authentication || 'Windows'}`,
                launchJsonPath: info.launchJsonPath,
                configIndex: info.configIndex,
                picked: true // Pre-select all
            });
        });
    }

    const selectedItems = await vscode.window.showQuickPick(options, {
        placeHolder: `Select which launch configurations to update (${allConfigsInfo.length} configuration${allConfigsInfo.length > 1 ? 's' : ''} found)`,
        canPickMany: true,
        ignoreFocusOut: true
    });

    if (!selectedItems || selectedItems.length === 0) {
        return undefined;
    }

    // Build map of launch.json path -> array of config indices
    const result = new Map<string, number[]>();
    for (const item of selectedItems) {
        if (!result.has(item.launchJsonPath)) {
            result.set(item.launchJsonPath, []);
        }
        result.get(item.launchJsonPath)!.push(item.configIndex);
    }

    return result;
}

// Select which launch configurations to update
async function selectLaunchConfigurations(configurations: any[], launchJsonPath: string): Promise<number[] | undefined> {
    interface ConfigQuickPickItem extends vscode.QuickPickItem {
        index: number;
    }

    const options: ConfigQuickPickItem[] = configurations.map((config, index) => ({
        label: config.name || `Configuration ${index + 1}`,
        description: `${config.server || 'Local'} - ${config.serverInstance || 'N/A'}`,
        detail: `Type: ${config.type || 'al'}, Authentication: ${config.authentication || 'Windows'}`,
        index: index,
        picked: true // Pre-select all configurations by default
    }));

    const selectedItems = await vscode.window.showQuickPick(options, {
        placeHolder: `Select which configurations to update in ${path.basename(launchJsonPath)}`,
        canPickMany: true,
        ignoreFocusOut: true
    });

    if (!selectedItems || selectedItems.length === 0) {
        return undefined;
    }

    // Return the selected configuration indices
    return selectedItems.map(item => item.index);
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
    launchJson: any,
    configurationsToUpdate: number[]
): void {
    try {
        let content = fs.readFileSync(launchJsonPath, 'utf-8');

        CustomConsole.customConsole.appendLine(`[AL Navigator] Updating launch.json: ${launchJsonPath}`);
        CustomConsole.customConsole.appendLine(`[AL Navigator] Configurations to update: ${configurationsToUpdate.join(', ')}`);

        if (launchJson.configurations && Array.isArray(launchJson.configurations)) {
            for (let i = 0; i < launchJson.configurations.length; i++) {
                // Only update configurations that are in the list
                if (!configurationsToUpdate.includes(i)) {
                    continue;
                }

                const config = launchJson.configurations[i];
                CustomConsole.customConsole.appendLine(`[AL Navigator] Updating configuration ${i}: ${config.name || 'Unnamed'}`);

                try {
                    // Apply edits sequentially to avoid overlapping edits
                    // Each edit is based on the current content state

                    // Update startupObjectId
                    const objectIdEdits = jsonc.modify(
                        content,
                        ['configurations', i, 'startupObjectId'],
                        config.startupObjectId,
                        { formattingOptions: { tabSize: 4, insertSpaces: true } }
                    );
                    CustomConsole.customConsole.appendLine(`[AL Navigator]   - startupObjectId edits: ${objectIdEdits.length}`);

                    if (objectIdEdits.length > 0) {
                        // Sort edits by offset in descending order
                        objectIdEdits.sort((a, b) => b.offset - a.offset);
                        // Apply the edits immediately to update content
                        content = jsonc.applyEdits(content, objectIdEdits);
                        CustomConsole.customConsole.appendLine(`[AL Navigator]   - Applied startupObjectId edits`);
                    }

                    // Update startupObjectType (using the updated content from previous edit)
                    const objectTypeEdits = jsonc.modify(
                        content,
                        ['configurations', i, 'startupObjectType'],
                        config.startupObjectType,
                        { formattingOptions: { tabSize: 4, insertSpaces: true } }
                    );
                    CustomConsole.customConsole.appendLine(`[AL Navigator]   - startupObjectType edits: ${objectTypeEdits.length}`);

                    if (objectTypeEdits.length > 0) {
                        // Sort edits by offset in descending order
                        objectTypeEdits.sort((a, b) => b.offset - a.offset);
                        // Apply the edits immediately to update content
                        content = jsonc.applyEdits(content, objectTypeEdits);
                        CustomConsole.customConsole.appendLine(`[AL Navigator]   - Applied startupObjectType edits`);
                    }
                } catch (error) {
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ERROR updating configuration ${i}: ${error.message}`);
                    throw error;
                }
            }
        }

        // Write the final updated content
        fs.writeFileSync(launchJsonPath, content, 'utf-8');

        CustomConsole.customConsole.appendLine(`[AL Navigator] Successfully updated ${launchJsonPath}`);
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] ERROR in writeLaunchJsonWithFormatting: ${error.message}`);
        CustomConsole.customConsole.appendLine(`[AL Navigator] Stack trace: ${error.stack}`);
        throw new Error(`Failed to update launch.json: ${error.message}`);
    }
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

    // Get the .alpackages folder path (supports custom al.packageCachePath configuration)
    const alpackagesFolderPath = getAlPackagesFolder(folderPath);

    if (!alpackagesFolderPath) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] No .alpackages folder found in workspace: ${folderPath}`);
        CustomConsole.customConsole.appendLine(`[AL Navigator] Please check your 'al.packageCachePath' configuration in settings.json if you're using a custom path`);
        vscode.window.showWarningMessage('AL Navigator: No .alpackages folder found. Please check your workspace configuration.');
        return objects;
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Using .alpackages folder: ${alpackagesFolderPath}`);

    let appFiles: string[];
    try {
        appFiles = fs.readdirSync(alpackagesFolderPath).filter(file => file.endsWith('.app'));
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error reading .alpackages folder: ${error.message}`);
        CustomConsole.customConsole.appendLine(`[AL Navigator] Folder path: ${alpackagesFolderPath}`);
        vscode.window.showErrorMessage(`AL Navigator: Error accessing .alpackages folder: ${error.message}`);
        return objects;
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Found ${appFiles.length} .app files in .alpackages folder`);

    // Get current workspace app info to exclude old versions
    const currentAppInfo = getCurrentAppInfo(folderPath);
    if (currentAppInfo) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Current workspace app: ${currentAppInfo.name} (${currentAppInfo.version})`);
    }

    // Group apps by name and version (extracted from filename)
    const appsByName = new Map<string, Array<{ file: string; version: string; appName: string }>>();

    // Process each app file - extract name and version from filename
    for (const file of appFiles) {
        // Parse filename: "Publisher_AppName_Version.app"
        // Example: "Microsoft_Base Application_27.0.38460.40242.app"
        const fileNameWithoutExt = file.replace('.app', '');
        const parts = fileNameWithoutExt.split('_');

        if (parts.length < 3) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Skipping ${file} - unexpected filename format`);
            continue;
        }

        // Last part is version, everything before last underscore is app name
        const version = parts[parts.length - 1];
        const appName = parts.slice(1, -1).join('_'); // Skip publisher (first part), take everything until version
        const publisher = parts[0];

        CustomConsole.customConsole.appendLine(`[AL Navigator] Checking ${file}: ${appName} v${version}`);

        // Skip if this is the current workspace app
        if (currentAppInfo && appName === currentAppInfo.name) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Skipping ${file} - it's the workspace app itself (${currentAppInfo.name})`);
            continue;
        }

        if (!appsByName.has(appName)) {
            appsByName.set(appName, []);
        }
        appsByName.get(appName)!.push({ file, version, appName });
        CustomConsole.customConsole.appendLine(`[AL Navigator] Added app: ${appName} v${version} (${file})`);
    }

    // Determine which app files to process (latest version only)
    const filesToProcess: string[] = [];
    for (const [appName, versions] of appsByName.entries()) {
        if (versions.length === 1) {
            filesToProcess.push(versions[0].file);
            CustomConsole.customConsole.appendLine(`[AL Navigator] Processing ${appName}: ${versions[0].file}`);
        } else {
            // Sort by version descending and take the first (latest)
            const sorted = versions.sort((a, b) => compareVersions(b.version, a.version));
            filesToProcess.push(sorted[0].file);
            CustomConsole.customConsole.appendLine(`[AL Navigator] Multiple versions of ${appName} found. Using latest: ${sorted[0].version} (${sorted[0].file})`);
            for (let i = 1; i < sorted.length; i++) {
                CustomConsole.customConsole.appendLine(`[AL Navigator]   - Skipping older version: ${sorted[i].version} (${sorted[i].file})`);
            }
        }
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Processing ${filesToProcess.length} app files for object extraction`);

    // Extract objects from selected files
    for (const file of filesToProcess) {
        const appFilePath = path.join(alpackagesFolderPath, file);
        const cleanedAppFilePath = path.join(path.dirname(appFilePath), `${path.basename(appFilePath, '.app')}.zip`);

        try {
            await removeHeaderFromAppFile(appFilePath, cleanedAppFilePath);

            const zip = new AdmZip(cleanedAppFilePath);
            const entries = zip.getEntries();
            let objectCount = 0;

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
                            objectCount++;
                        }
                    }
                }
            }
            CustomConsole.customConsole.appendLine(`[AL Navigator] Extracted ${objectCount} objects from ${file}`);
        } catch (error) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Error processing ${file}: ${error.message}`);
            vscode.window.showErrorMessage(`Error processing .app file ${file}: ${error.message}`);
        } finally {
            // Delete the temporary ZIP file
            if (fs.existsSync(cleanedAppFilePath)) {
                try {
                    fs.unlinkSync(cleanedAppFilePath);
                } catch (unlinkError) {
                    CustomConsole.customConsole.appendLine(`[AL Navigator] Warning: Could not delete temp file ${cleanedAppFilePath}`);
                }
            }
        }
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Total objects extracted from .app files: ${objects.length}`);
    return objects;
}

// Get current workspace app information
function getCurrentAppInfo(workspaceFolder: string): { name: string; version: string } | null {
    const appJsonPath = path.join(workspaceFolder, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
        return null;
    }

    try {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
        return {
            name: appJson.name || 'Unknown',
            version: appJson.version || '0.0.0.0'
        };
    } catch (error) {
        console.error('Error reading app.json:', error.message);
        return null;
    }
}

// Compare semantic versions (e.g., "1.2.3.4")
function compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(p => parseInt(p, 10) || 0);
    const v2Parts = version2.split('.').map(p => parseInt(p, 10) || 0);

    // Ensure both arrays have the same length
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);

    for (let i = 0; i < maxLength; i++) {
        if (v1Parts[i] > v2Parts[i]) return 1;
        if (v1Parts[i] < v2Parts[i]) return -1;
    }

    return 0;
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
