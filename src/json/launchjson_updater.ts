import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFile } from '../al/alFile';
import { RecentlyUsedObjectsManager } from './recentlyUsedObjects';
import * as jsonc from 'jsonc-parser';
import { CustomConsole } from '../additional/console';
import { getAlPackagesFolder } from '../files/folderHelper';
import * as crypto from 'crypto';
const AdmZip = require('adm-zip'); // For handling .app files

// Cache interface for storing loaded objects and translations
interface ObjectCache {
    objects: { id: number; name: string; type: string; appName: string }[];
    translations: Map<string, string>;
    cacheKey: string;
    timestamp: number;
    appFiles: string[]; // List of .app filenames that were loaded
    alFilesHash?: string; // Hash of workspace .al files for detecting changes
    selectedLanguage?: string; // Track which language was used for translations
}

// Serializable cache interface for persistence (Map needs to be converted to array)
interface SerializableObjectCache {
    objects: { id: number; name: string; type: string; appName: string }[];
    translations: [string, string][]; // Map converted to array of [key, value] pairs
    cacheKey: string;
    timestamp: number;
    appFiles: string[];
    alFilesHash?: string; // Hash of workspace .al files for detecting changes
    selectedLanguage?: string; // Track which language was used for translations
}

// Global cache storage (in-memory)
let objectCache: ObjectCache | null = null;

// Cache key for workspace state
const CACHE_STATE_KEY = 'alNavigator.objectCache';

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

// Generate a cache key based on workspace content
async function generateCacheKey(workspaceFolder: string): Promise<string> {
    const hash = crypto.createHash('md5');

    // Hash .app files (name + size + modified time)
    const alpackagesFolderPath = getAlPackagesFolder(workspaceFolder);
    if (alpackagesFolderPath && fs.existsSync(alpackagesFolderPath)) {
        try {
            const appFiles = fs.readdirSync(alpackagesFolderPath).filter(file => file.endsWith('.app'));
            for (const file of appFiles.sort()) {
                const filePath = path.join(alpackagesFolderPath, file);
                const stats = fs.statSync(filePath);
                hash.update(`${file}-${stats.size}-${stats.mtimeMs}`);
            }
        } catch (error) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Error hashing .app files: ${error.message}`);
        }
    }

    // Note: We intentionally do NOT hash .al files here anymore!
    // Reason: The partial cache update mechanism (attemptPartialCacheUpdate) handles 
    // workspace .al file changes efficiently by only reloading workspace objects.
    // If we include .al file hashes here, the cache key would change on every .al file 
    // modification, causing unnecessary full reloads of all .app objects.
    // The cache is now only invalidated when .app files change, and .al changes are 
    // handled incrementally.

    return hash.digest('hex');
}

// Generate hash for workspace .al files only (for detecting workspace changes)
async function generateAlFilesHash(workspaceFolder: string): Promise<string> {
    const hash = crypto.createHash('md5');

    try {
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.al');
        const alFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

        // Sort files for consistent hashing
        const sortedFiles = alFiles.map(f => f.fsPath).sort();

        // Hash each AL file path and modification time
        for (const filePath of sortedFiles) {
            try {
                const stats = fs.statSync(filePath);
                const relativePath = path.relative(workspaceFolder, filePath);
                hash.update(`${relativePath}-${stats.mtimeMs}`);
            } catch (statError) {
                // File might have been deleted between findFiles and statSync
            }
        }

        // Also include count
        hash.update(`alfiles-${alFiles.length}`);
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error hashing .al files: ${error.message}`);
    }

    return hash.digest('hex');
}

// Load cache from persistent storage
async function loadCacheFromStorage(workspaceFolder: string): Promise<void> {
    if (!extensionContext) {
        return;
    }

    try {
        const workspaceState = extensionContext.workspaceState;
        const cacheKey = `${CACHE_STATE_KEY}.${Buffer.from(workspaceFolder).toString('base64')}`;
        const storedCache = workspaceState.get<SerializableObjectCache>(cacheKey);

        if (storedCache) {
            // Convert serializable cache back to ObjectCache
            objectCache = {
                objects: storedCache.objects,
                translations: new Map(storedCache.translations),
                cacheKey: storedCache.cacheKey,
                timestamp: storedCache.timestamp,
                appFiles: storedCache.appFiles,
                alFilesHash: storedCache.alFilesHash,
                selectedLanguage: storedCache.selectedLanguage
            };

            const ageMinutes = (Date.now() - objectCache.timestamp) / 60000;
            const ageHours = ageMinutes / 60;
            const ageDays = ageHours / 24;

            let ageString: string;
            if (ageDays >= 1) {
                ageString = `${ageDays.toFixed(1)} days`;
            } else if (ageHours >= 1) {
                ageString = `${ageHours.toFixed(1)} hours`;
            } else {
                ageString = `${ageMinutes.toFixed(1)} minutes`;
            }

            CustomConsole.customConsole.appendLine(`[AL Navigator] 💾 Loaded cache from storage: ${objectCache.objects.length} objects, ${objectCache.translations.size} translations (age: ${ageString}, language: ${objectCache.selectedLanguage || 'auto'})`);
        }
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error loading cache from storage: ${error.message}`);
        objectCache = null;
    }
}

// Save cache to persistent storage
async function saveCacheToStorage(workspaceFolder: string): Promise<void> {
    if (!extensionContext || !objectCache) {
        return;
    }

    try {
        const workspaceState = extensionContext.workspaceState;
        const cacheKey = `${CACHE_STATE_KEY}.${Buffer.from(workspaceFolder).toString('base64')}`;

        // Convert ObjectCache to SerializableObjectCache
        const serializableCache: SerializableObjectCache = {
            objects: objectCache.objects,
            translations: Array.from(objectCache.translations.entries()),
            cacheKey: objectCache.cacheKey,
            timestamp: objectCache.timestamp,
            appFiles: objectCache.appFiles,
            alFilesHash: objectCache.alFilesHash,
            selectedLanguage: objectCache.selectedLanguage
        };

        await workspaceState.update(cacheKey, serializableCache);
        CustomConsole.customConsole.appendLine(`[AL Navigator] 💾 Saved cache to storage: ${objectCache.objects.length} objects, ${objectCache.translations.size} translations (language: ${objectCache.selectedLanguage || 'auto'})`);
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error saving cache to storage: ${error.message}`);
    }
}

// Check if cache is valid for the current workspace
async function isCacheValid(workspaceFolder: string, appName: string, selectedLanguage: string = ''): Promise<boolean> {
    // Try to load from storage if not in memory
    if (!objectCache) {
        await loadCacheFromStorage(workspaceFolder);
    }

    if (!objectCache) {
        return false;
    }

    const currentKey = await generateCacheKey(workspaceFolder);
    const isValid = objectCache.cacheKey === currentKey;

    if (isValid) {
        // Cache key is valid (no .app changes), but we still need to check if .al files changed
        // This allows us to do partial updates for workspace .al changes without full reload
        const canPartialUpdate = await attemptPartialCacheUpdate(workspaceFolder, appName, selectedLanguage);
        if (canPartialUpdate) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Cache partially updated (workspace .al files changed)`);
            // Save updated cache
            await saveCacheToStorage(workspaceFolder);
            return true;
        }

        // No changes detected at all
        const ageMinutes = (Date.now() - objectCache.timestamp) / 60000;
        CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Using cached objects and translations (age: ${ageMinutes.toFixed(1)} minutes)`);
        return true;
    } else {
        // Cache key changed (.app files changed) - try partial update
        const canPartialUpdate = await attemptPartialCacheUpdate(workspaceFolder, appName, selectedLanguage);
        if (canPartialUpdate) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Cache partially updated (.app files changed)`);
            // Save updated cache
            await saveCacheToStorage(workspaceFolder);
            return true;
        } else {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Cache invalid - workspace has changed (full reload required)`);
        }
    }

    return false;
}
// Attempt to partially update cache (e.g., remove objects from deleted .app files)
async function attemptPartialCacheUpdate(workspaceFolder: string, appName: string, selectedLanguage: string = ''): Promise<boolean> {
    if (!objectCache) {
        return false;
    }

    try {
        // Get current .app files
        const alpackagesFolderPath = getAlPackagesFolder(workspaceFolder);
        if (!alpackagesFolderPath || !fs.existsSync(alpackagesFolderPath)) {
            return false;
        }

        const currentAppFiles = fs.readdirSync(alpackagesFolderPath)
            .filter(file => file.endsWith('.app'))
            .sort();

        // Compare with cached .app files
        const cachedAppFiles = objectCache.appFiles || [];
        const addedApps = currentAppFiles.filter(app => !cachedAppFiles.includes(app));
        const removedApps = cachedAppFiles.filter(app => !currentAppFiles.includes(app));

        // Check if workspace .al files changed
        const currentAlHash = await generateAlFilesHash(workspaceFolder);
        const cachedAlHash = objectCache.alFilesHash || '';
        const alFilesChanged = currentAlHash !== cachedAlHash;

        // Check if only .app files changed (no AL file changes)
        const onlyAppChanges = (removedApps.length > 0 || addedApps.length > 0) && !alFilesChanged;

        // Check if only .al files changed (no .app file changes)
        const onlyAlChanges = addedApps.length === 0 && removedApps.length === 0 && alFilesChanged;

        // Debug logging
        CustomConsole.customConsole.appendLine(`[AL Navigator] 🔍 Partial Update Check:`);
        CustomConsole.customConsole.appendLine(`[AL Navigator]    Apps: added=${addedApps.length}, removed=${removedApps.length}`);
        CustomConsole.customConsole.appendLine(`[AL Navigator]    AL files changed: ${alFilesChanged} (current hash: ${currentAlHash.substring(0, 8)}..., cached: ${cachedAlHash.substring(0, 8)}...)`);
        CustomConsole.customConsole.appendLine(`[AL Navigator]    Scenarios: onlyAppChanges=${onlyAppChanges}, onlyAlChanges=${onlyAlChanges}`);

        // No changes at all
        if (addedApps.length === 0 && removedApps.length === 0 && !alFilesChanged) {
            // CustomConsole.customConsole.appendLine(`[AL Navigator] ℹ️  No changes detected - cache is up to date`);
            return false; // Return false so caller knows no update was needed
        } if (removedApps.length > 0 && addedApps.length === 0 && onlyAppChanges) {
            // Only apps were removed - we can partially update
            CustomConsole.customConsole.appendLine(`[AL Navigator] 📦 Scenario: Only .app files removed`);
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Updating AL Objects Cache...',
                    cancellable: false,
                },
                async (progress) => {
                    const partialUpdateStartTime = Date.now();

                    // Count objects before filtering
                    const objectsBefore = objectCache!.objects.length;

                    // Remove objects from deleted apps
                    progress.report({ message: 'Removing objects from deleted apps...' });
                    const filteredObjects = objectCache!.objects.filter(obj => {
                        // Keep workspace objects
                        if (obj.appName === '*workspace*') {
                            return true;
                        }
                        // Keep objects from apps that still exist
                        return !removedApps.includes(obj.appName);
                    });

                    const objectsRemoved = objectsBefore - filteredObjects.length;

                    // Remove translations from deleted apps (we need to reload translations for safety)
                    // because we don't track which translation came from which app
                    progress.report({ message: 'Reloading translations...' });
                    const translationsMap = await extractTranslationsFromAppFiles(workspaceFolder);

                    // Update cache
                    const newCacheKey = await generateCacheKey(workspaceFolder);
                    const newAlHash = await generateAlFilesHash(workspaceFolder);
                    objectCache = {
                        objects: filteredObjects,
                        translations: translationsMap,
                        cacheKey: newCacheKey,
                        timestamp: Date.now(),
                        appFiles: currentAppFiles,
                        alFilesHash: newAlHash,
                        selectedLanguage: selectedLanguage
                    };

                    const partialUpdateDuration = Date.now() - partialUpdateStartTime;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ✅ Removed ${objectsRemoved} objects. Cache: ${filteredObjects.length} objects (${partialUpdateDuration}ms)`);
                    return true;
                }
            );
        }

        // Check if only apps were added (no removals, no .al file changes)
        if (addedApps.length > 0 && removedApps.length === 0 && onlyAppChanges) {
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Updating AL Objects Cache...',
                    cancellable: false,
                },
                async (progress) => {
                    const partialUpdateStartTime = Date.now();
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Only apps added - partial cache update possible`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator] Detected new .app files: ${addedApps.join(', ')}`);

                    // Extract objects only from new apps
                    progress.report({ message: `Extracting objects from ${addedApps.length} new app${addedApps.length > 1 ? 's' : ''}...` });
                    const extractStartTime = Date.now();
                    const newObjects: { id: number; name: string; type: string; appName: string }[] = [];
                    for (const appFileName of addedApps) {
                        const appFilePath = path.join(alpackagesFolderPath, appFileName);
                        const objectsFromApp = await extractObjectsFromSingleAppFile(appFilePath, appFileName);
                        newObjects.push(...objectsFromApp);
                    }
                    const extractDuration = Date.now() - extractStartTime;

                    // Reload all translations (we don't know which translation came from new app)
                    progress.report({ message: 'Reloading translations...' });
                    const translationStartTime = Date.now();
                    const translationsMap = await extractTranslationsFromAppFiles(workspaceFolder);
                    const translationDuration = Date.now() - translationStartTime;

                    // Update cache
                    const combinedObjects = [...objectCache!.objects, ...newObjects];
                    const newCacheKey = await generateCacheKey(workspaceFolder);
                    const newAlHash = await generateAlFilesHash(workspaceFolder);
                    objectCache = {
                        objects: combinedObjects,
                        translations: translationsMap,
                        cacheKey: newCacheKey,
                        timestamp: Date.now(),
                        appFiles: currentAppFiles,
                        alFilesHash: newAlHash,
                        selectedLanguage: selectedLanguage
                    };

                    const partialUpdateDuration = Date.now() - partialUpdateStartTime;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] Added ${newObjects.length} objects from new apps. Cache now has ${combinedObjects.length} objects.`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  Partial update breakdown: extraction=${extractDuration}ms, translations=${translationDuration}ms, total=${partialUpdateDuration}ms (${(partialUpdateDuration / 1000).toFixed(2)}s)`);
                    return true;
                }
            );
        }

        // Check if only .al files changed (no .app file changes)
        if (addedApps.length === 0 && removedApps.length === 0) {
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Updating Workspace AL Objects...',
                    cancellable: false,
                },
                async (progress) => {
                    const partialUpdateStartTime = Date.now();
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Only workspace .al files changed - partial cache update possible`);

                    // Remove all workspace objects from cache
                    progress.report({ message: 'Removing old workspace objects...' });
                    const objectsBefore = objectCache!.objects.length;
                    const appOnlyObjects = objectCache!.objects.filter(obj => obj.appName !== '*workspace*');
                    const workspaceObjectsBefore = objectsBefore - appOnlyObjects.length;

                    // Re-extract workspace objects
                    progress.report({ message: 'Extracting workspace AL objects...' });
                    const extractStartTime = Date.now();
                    const alObjects = await extractObjectsFromAlFiles(workspaceFolder, ['page', 'report'], '*workspace*');
                    const extractDuration = Date.now() - extractStartTime;

                    // Combine app objects with new workspace objects
                    const combinedObjects = [...appOnlyObjects, ...alObjects];

                    // Update cache
                    const newCacheKey = await generateCacheKey(workspaceFolder);
                    const newAlHash = await generateAlFilesHash(workspaceFolder);
                    objectCache = {
                        objects: combinedObjects,
                        translations: objectCache!.translations, // Keep existing translations
                        cacheKey: newCacheKey,
                        timestamp: Date.now(),
                        appFiles: currentAppFiles,
                        alFilesHash: newAlHash,
                        selectedLanguage: selectedLanguage
                    };

                    const partialUpdateDuration = Date.now() - partialUpdateStartTime;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] Replaced ${workspaceObjectsBefore} workspace objects with ${alObjects.length} objects. Cache now has ${combinedObjects.length} objects.`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  Partial update breakdown: extraction=${extractDuration}ms, total=${partialUpdateDuration}ms (${(partialUpdateDuration / 1000).toFixed(2)}s)`);
                    return true;
                }
            );
        }

        // Changes are too complex for partial update
        CustomConsole.customConsole.appendLine(`[AL Navigator] ✗ Changes too complex for partial update - full reload required`);
        CustomConsole.customConsole.appendLine(`[AL Navigator]   Reason: addedApps=${addedApps.length}, removedApps=${removedApps.length}, onlyAppChanges=${onlyAppChanges}`);
        return false;

    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error during partial cache update: ${error.message}`);
        return false;
    }
}

// Clear the object cache (exported function)
export async function clearObjectCache(): Promise<void> {
    if (objectCache) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Cache cleared (had ${objectCache.objects.length} objects and ${objectCache.translations.size} translations)`);
        objectCache = null;

        // Also clear from persistent storage
        if (extensionContext) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder) {
                const cacheKey = `${CACHE_STATE_KEY}.${Buffer.from(workspaceFolder).toString('base64')}`;
                await extensionContext.workspaceState.update(cacheKey, undefined);
                CustomConsole.customConsole.appendLine(`[AL Navigator] 💾 Cleared cache from storage`);
            }
        }

        vscode.window.showInformationMessage('AL Navigator: Object cache cleared. Objects will be reloaded on next selection.');
    } else {
        vscode.window.showInformationMessage('AL Navigator: No cache to clear.');
    }
}

// Show all objects from workspace and .app files
async function showAllObjects(
    workspaceFolder: string,
    appName: string,
    currentObjectId?: number,
    currentObjectType?: string
): Promise<{ label: string; id: number; type: string } | undefined> {
    // Automatically detect the most common translation language
    const selectedLanguage = await detectMostCommonLanguage(workspaceFolder);

    if (selectedLanguage) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] 🌍 Language: ${selectedLanguage.toUpperCase()}`);
    } else {
        // CustomConsole.customConsole.appendLine(`[AL Navigator] ℹ️  No translations available - showing English names only`);
    }

    // Check if we can use cached data
    const cacheValid = await isCacheValid(workspaceFolder, appName, selectedLanguage);

    let combinedObjects: { id: number; name: string; type: string; appName: string }[];
    let translations: Map<string, string>;

    // Invalidate cache if it has 0 translations but we expect some (language is selected)
    const cacheHasInvalidTranslations = objectCache && selectedLanguage && objectCache.translations.size === 0;

    if (cacheHasInvalidTranslations) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] ⚠️  Cache has 0 translations but language '${selectedLanguage}' is selected - invalidating cache`);
    }

    if (cacheValid && objectCache && objectCache.selectedLanguage === selectedLanguage && !cacheHasInvalidTranslations) {
        // CustomConsole.customConsole.appendLine(`[AL Navigator] Using ${objectCache.objects.length} cached objects and ${objectCache.translations.size} cached translations for ${selectedLanguage || 'no language'}`);
        combinedObjects = objectCache.objects;
        translations = objectCache.translations;
    } else {
        const fullLoadStartTime = Date.now();
        // Show progress indicator
        const progressMessage = vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: selectedLanguage ? `Loading AL Objects (${selectedLanguage})...` : 'Loading AL Objects...',
                cancellable: false,
            },
            async (progress) => {
                try {
                    progress.report({ message: 'Extracting objects from .app files...' });
                    const appStartTime = Date.now();
                    const appObjects = await extractObjectsFromAppFiles(workspaceFolder);
                    const appDuration = Date.now() - appStartTime;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  App extraction took ${appDuration}ms`);

                    progress.report({ message: 'Extracting objects from .al files...' });
                    const alStartTime = Date.now();
                    const alObjects = await extractObjectsFromAlFiles(workspaceFolder, ['page', 'report'], '*workspace*');
                    const alDuration = Date.now() - alStartTime;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  AL file extraction took ${alDuration}ms`);

                    progress.report({ message: selectedLanguage ? `Loading translations (${selectedLanguage})...` : 'Loading translations...' });
                    const translationStartTime = Date.now();

                    // Load translations from .app files
                    const appTranslations = await extractTranslationsFromAppFiles(workspaceFolder, selectedLanguage);
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] Loaded ${appTranslations.size} translations from .app files`);

                    // Load translations from workspace XLF files
                    const workspaceTranslations = await extractTranslationsFromWorkspaceXlf(workspaceFolder, selectedLanguage);
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] Loaded ${workspaceTranslations.size} translations from workspace XLF`);

                    // Load translations from AL file comments (e.g., Comment = 'DEU="..."')
                    const alCommentTranslations = await extractTranslationsFromAlFileComments(workspaceFolder, selectedLanguage);
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] Loaded ${alCommentTranslations.size} translations from AL file comments`);

                    // Combine translations (priority: AL comments > workspace XLF > app translations)
                    const combinedTranslations = new Map<string, string>([
                        ...appTranslations,
                        ...workspaceTranslations,
                        ...alCommentTranslations  // AL comments have highest priority
                    ]);
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 📊 Total combined translations: ${combinedTranslations.size}`);

                    const translationDuration = Date.now() - translationStartTime;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  Translation extraction took ${translationDuration}ms`);

                    progress.report({ message: 'Combining and sorting objects...' });
                    const combined = [...alObjects, ...appObjects];

                    if (combined.length === 0) {
                        vscode.window.showErrorMessage('No AL objects found in the workspace or .app files.');
                        return { objects: [], translations: new Map<string, string>() };
                    }

                    return { objects: combined, translations: combinedTranslations };
                } catch (error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    return { objects: [], translations: new Map<string, string>() };
                }
            }
        );

        const result = await progressMessage;
        combinedObjects = result.objects;
        translations = result.translations;

        const fullLoadDuration = Date.now() - fullLoadStartTime;
        CustomConsole.customConsole.appendLine(`[AL Navigator] ⏱️  Full cache reload: ${fullLoadDuration}ms (${(fullLoadDuration / 1000).toFixed(2)}s)`);

        // Cache the results
        if (combinedObjects.length > 0) {
            const cacheKey = await generateCacheKey(workspaceFolder);
            const alHash = await generateAlFilesHash(workspaceFolder);

            // Get current .app files for cache
            const alpackagesFolderPath = getAlPackagesFolder(workspaceFolder);
            const appFiles = alpackagesFolderPath && fs.existsSync(alpackagesFolderPath)
                ? fs.readdirSync(alpackagesFolderPath).filter(file => file.endsWith('.app')).sort()
                : [];

            objectCache = {
                objects: combinedObjects,
                translations: translations,
                cacheKey: cacheKey,
                timestamp: Date.now(),
                appFiles: appFiles,
                alFilesHash: alHash,
                selectedLanguage: selectedLanguage
            };
            // CustomConsole.customConsole.appendLine(`[AL Navigator] Cached ${combinedObjects.length} objects and ${translations.size} translations from ${appFiles.length} .app files (language: ${selectedLanguage || 'auto'})`);

            // Save cache to persistent storage
            await saveCacheToStorage(workspaceFolder);
        }
    }

    // Sort objects (after loading from cache or fresh load)
    combinedObjects.sort((a, b) => {
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
        return undefined;
    }

    // Show the Quick Pick menu with translations
    // CustomConsole.customConsole.appendLine(`[AL Navigator] Building QuickPick with ${combinedObjects.length} objects and ${translations.size} translations`);

    // Debug: Show all translation keys that contain "Customer" to understand the mapping
    // CustomConsole.customConsole.appendLine(`[AL Navigator] === Debug: All Customer-related translations ===`);
    // for (const [key, value] of translations.entries()) {
    //     if (key.toLowerCase().includes('customer')) {
    //         CustomConsole.customConsole.appendLine(`[AL Navigator]   ${key} = ${value}`);
    //     }
    // }
    // CustomConsole.customConsole.appendLine(`[AL Navigator] === End of Customer translations ===`);

    // Debug: Show all translation keys that contain "Location" to understand the mapping
    // CustomConsole.customConsole.appendLine(`[AL Navigator] === Debug: All Location-related translations ===`);
    // for (const [key, value] of translations.entries()) {
    //     if (key.toLowerCase().includes('location')) {
    //         CustomConsole.customConsole.appendLine(`[AL Navigator]   ${key} = ${value}`);
    //     }
    // }
    // CustomConsole.customConsole.appendLine(`[AL Navigator] === End of Location translations ===`);

    // Create QuickPick for object selection
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = currentObjectId
        ? `Select an object (Current: ${currentObjectType} ${currentObjectId})`
        : `Select an object to set as the startup object`;

    quickPick.items = combinedObjects.map((obj) => {
        // Use the object name (English) as the key for translation lookup
        const translationKey = `${obj.type}-${obj.name}`;
        let translation = translations.get(translationKey);
        let usedFallback = false;

        // Glossary: Apply abbreviation translations BEFORE fallback strategies
        // This provides base translations that fallback patterns can then use
        // Example: "G/L Entry" -> "Sachposten" (then "G/L Entries" can become "Sachposten" via fallback)
        if (!translation) {
            const glossary = new Map<string, string>([
                // General Ledger / Sachposten
                ['G/L', 'Sachposten'],
                ['G/L Entry', 'Sachposten'],
                ['G/L Entries', 'Sachposten'],
                ['G/L Account', 'Sachkonto'],
                ['G/L Accounts', 'Sachkonten'],
                ['G/L Register', 'Sachpostenjournal'],

                // Intercompany / Konzernintern
                ['IC', 'Konz.'],
                ['IC Partner', 'Konz.-Partner'],
                ['IC Partners', 'Konz.-Partner'],
                ['IC Inbox', 'Konz.-Eingang'],
                ['IC Outbox', 'Konz.-Ausgang'],

                // Job / Projekt
                ['Job', 'Projekt'],
                ['Jobs', 'Projekte'],
                ['Job Card', 'Projektkarte'],
                ['Job List', 'Projekte'],
                ['Job Task', 'Projektaufgabe'],
                ['Job Tasks', 'Projektaufgaben'],
                ['Job Planning Line', 'Projektplanungszeile'],
                ['Job Planning Lines', 'Projektplanungszeilen'],
                ['Job Journal', 'Projekt Buch.-Blatt'],

                // CRM / Customer Relationship Management
                ['CRM', 'CRM'],
                ['CRM Statistics', 'CRM-Statistik'],

                // Additional common abbreviations
                ['Std.', 'Standard'],
                ['Purch.', 'Einkauf'],
                ['Whse.', 'Lager'],
                ['Invt.', 'Lager'],
                ['FA', 'Anlagen'],
                ['BOM', 'Stückliste'],
                ['SKU', 'Lagereinheit'],
                ['VAT', 'MwSt.'],
                ['Qty', 'Menge'],
                ['Amt', 'Betrag'],
                ['Subcontracting', 'Fremdarbeit'],

                // Power BI & Azure (keep English)
                ['Power BI', 'Power BI'],
                ['Azure AD', 'Azure AD'],
                ['Azure', 'Azure'],

                // Email & Technical (keep English)
                ['Email', 'E-Mail'],
                ['SMTP', 'SMTP'],
                ['OCR', 'OCR'],
                ['XML', 'XML'],
                ['API', 'API']
            ]);

            // First try exact match in glossary
            let glossaryTranslation = glossary.get(obj.name);

            // If no exact match, try to find and replace parts
            if (!glossaryTranslation) {
                let modifiedName = obj.name;
                let foundGlossaryMatch = false;

                // Try to replace each glossary term in the object name
                for (const [englishTerm, germanTerm] of glossary.entries()) {
                    if (modifiedName.includes(englishTerm)) {
                        modifiedName = modifiedName.replace(new RegExp(englishTerm, 'g'), germanTerm);
                        foundGlossaryMatch = true;
                    }
                }

                // If we found glossary matches, try to look up the modified name
                if (foundGlossaryMatch) {
                    const glossaryKey = `${obj.type}-${modifiedName}`;
                    glossaryTranslation = translations.get(glossaryKey);

                    if (glossaryTranslation) {
                        translation = glossaryTranslation;
                        usedFallback = true;
                        CustomConsole.customConsole.appendLine(`[AL Navigator] 📖 Glossary: "${obj.name}" -> "${modifiedName}" = "${translation}"`);
                    }
                }
            } else {
                // Found exact match in glossary
                translation = glossaryTranslation;
                usedFallback = true;
                CustomConsole.customConsole.appendLine(`[AL Navigator] 📖 Glossary (exact): "${obj.name}" = "${translation}"`);
            }
        }

        // Fallback strategies if no direct translation found
        if (!translation) {
            // Strategy 1: If name ends with " List", try plural form
            // Example: "Location List" -> "Locations"
            if (obj.name.endsWith(' List')) {
                const baseNamePlural = obj.name.replace(' List', 's');
                const fallbackKey = `${obj.type}-${baseNamePlural}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (List→s): "${obj.name}" -> "${baseNamePlural}" = "${translation}"`);
                }
            }

            // Strategy 2: Try replacing "persons" with "people"
            // Example: "Salespersons/Purchasers" -> "Salespeople/Purchasers"
            if (!translation && obj.name.includes('persons')) {
                const peopleName = obj.name.replace('persons', 'people');
                const fallbackKey = `${obj.type}-${peopleName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (persons→people): "${obj.name}" -> "${peopleName}" = "${translation}"`);
                }
            }

            // Strategy 3: Try common singular/plural variations
            // Example: "Salesperson" -> "Salespeople", "Person" -> "People"
            if (!translation && obj.name.includes('person')) {
                const variations = [
                    obj.name.replace('person', 'people'),
                    obj.name.replace('Person', 'People')
                ];

                for (const variant of variations) {
                    const fallbackKey = `${obj.type}-${variant}`;
                    translation = translations.get(fallbackKey);
                    if (translation) {
                        usedFallback = true;
                        CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (person→people): "${obj.name}" -> "${variant}" = "${translation}"`);
                        break;
                    }
                }
            }

            // Strategy 4: If name ends with " Lookup", try plural form
            // Example: "Vendor Lookup" -> "Vendors", "Customer Lookup" -> "Customers"
            if (!translation && obj.name.endsWith(' Lookup')) {
                const baseName = obj.name.replace(' Lookup', '');
                const baseNamePlural = baseName + 's';
                const fallbackKey = `${obj.type}-${baseNamePlural}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Lookup→s): "${obj.name}" -> "${baseNamePlural}" = "${translation}"`);
                }
            }

            // Strategy 5: If name ends with " Subform", try just "Lines"
            // Example: "Sales Order Subform" -> "Lines", "Purchase Order Subform" -> "Lines"
            // Microsoft uses generic "Lines" caption for most subform pages
            if (!translation && obj.name.endsWith(' Subform')) {
                const fallbackKey = `${obj.type}-Lines`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Subform→Lines): "${obj.name}" -> "Lines" = "${translation}"`);
                }
            }

            // Strategy 6: If name contains " Comment " with a prefix, try removing prefix
            // Example: "Purch. Comment List" -> "Comment List", "Sales Comment Sheet" -> "Comment Sheet"
            // Microsoft uses this pattern for comment pages across different modules
            if (!translation && obj.name.includes(' Comment ')) {
                const commentIndex = obj.name.indexOf(' Comment ');
                if (commentIndex > 0) {
                    const withoutPrefix = obj.name.substring(commentIndex + 1); // +1 to skip the space
                    const fallbackKey = `${obj.type}-${withoutPrefix}`;
                    translation = translations.get(fallbackKey);

                    if (translation) {
                        usedFallback = true;
                        CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Remove prefix before Comment): "${obj.name}" -> "${withoutPrefix}" = "${translation}"`);
                    }
                }
            }

            // Strategy 7: If name ends with " Entity", try without Entity suffix
            // Example: "Sales Invoice Entity" -> "Sales Invoice", "Customer Entity" -> "Customer"
            // API pages often have "Entity" suffix which is not in translations
            if (!translation && obj.name.endsWith(' Entity')) {
                const baseName = obj.name.replace(' Entity', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Entity): "${obj.name}" -> "${baseName}" = "${translation}"`);
                }
            }

            // Strategy 8: If name ends with " Part", try without Part suffix
            // Example: "G/L Entries Part" -> "G/L Entries", "My Notifications Part" -> "My Notifications"
            // List parts often have "Part" suffix which is not in translations
            if (!translation && obj.name.endsWith(' Part')) {
                const baseName = obj.name.replace(' Part', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Part): "${obj.name}" -> "${baseName}" = "${translation}"`);
                }
            }

            // Strategy 9: If name ends with " FactBox", try without FactBox suffix
            // Example: "Item Statistics FactBox" -> "Item Statistics", "Job List FactBox" -> "Job List"
            // FactBox pages typically have same caption as their base page
            if (!translation && obj.name.endsWith(' FactBox')) {
                const baseName = obj.name.replace(' FactBox', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (FactBox): "${obj.name}" -> "${baseName}" = "${translation}"`);
                }
            }

            // Strategy 10: If name ends with " Lines", try translating as "Zeilen"
            // Example: "Sales Lines" -> "Sales" + "Zeilen", "Worksheet Lines" -> "Worksheet" + "Zeilen"
            // Many line subpages follow this pattern
            if (!translation && obj.name.endsWith(' Lines')) {
                const baseName = obj.name.replace(' Lines', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                const baseTranslation = translations.get(fallbackKey);

                if (baseTranslation) {
                    // Combine base translation with "Zeilen" (German for "Lines")
                    translation = `${baseTranslation}zeilen`;
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Lines→Zeilen): "${obj.name}" -> "${baseName}" + "zeilen" = "${translation}"`);
                }
            }

            // Strategy 11: If name ends with " Setup", try translating as "Einrichtung"
            // Example: "Marketing Setup" -> "Marketing" + "Einrichtung"
            // Setup pages typically use this German translation pattern
            if (!translation && obj.name.endsWith(' Setup')) {
                const baseName = obj.name.replace(' Setup', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                const baseTranslation = translations.get(fallbackKey);

                if (baseTranslation) {
                    // Combine base translation with "Einrichtung" (German for "Setup")
                    translation = `${baseTranslation}einrichtung`;
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Setup→Einrichtung): "${obj.name}" -> "${baseName}" + "einrichtung" = "${translation}"`);
                }
            }

            // Strategy 12: If name ends with " Preview", try without Preview or with "Vorschau"
            // Example: "G/L Posting Preview" -> "G/L Posting", then try with "Vorschau"
            // Preview pages often have same caption as their base page
            if (!translation && obj.name.endsWith(' Preview')) {
                const baseName = obj.name.replace(' Preview', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Preview): "${obj.name}" -> "${baseName}" = "${translation}"`);
                } else {
                    // Try adding "Vorschau" to the base translation
                    const baseTranslation = translations.get(fallbackKey);
                    if (baseTranslation) {
                        translation = `${baseTranslation} Vorschau`;
                        usedFallback = true;
                        // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Preview→Vorschau): "${obj.name}" -> "${baseName}" + " Vorschau" = "${translation}"`);
                    }
                }
            }

            // Strategy 13: If name ends with " Card", try without Card or with "Karte"
            // Example: "Resource Group Card" -> "Resource Group", then try with "Karte"
            // Card pages often have same caption as their base entity
            if (!translation && obj.name.endsWith(' Card')) {
                const baseName = obj.name.replace(' Card', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Card): "${obj.name}" -> "${baseName}" = "${translation}"`);
                } else {
                    // Try adding "Karte" to the base translation
                    const baseTranslation = translations.get(fallbackKey);
                    if (baseTranslation) {
                        translation = `${baseTranslation}karte`;
                        usedFallback = true;
                        // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Card→Karte): "${obj.name}" -> "${baseName}" + "karte" = "${translation}"`);
                    }
                }
            }

            // Strategy 14: If name ends with " Activities", try translating as "Aktivitäten"
            // Example: "Office 365 Sales Activities" -> "Office 365 Sales" + "Aktivitäten"
            // Activity pages follow this pattern
            if (!translation && obj.name.endsWith(' Activities')) {
                const baseName = obj.name.replace(' Activities', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                const baseTranslation = translations.get(fallbackKey);

                if (baseTranslation) {
                    // Combine base translation with "Aktivitäten" (German for "Activities")
                    translation = `${baseTranslation} Aktivitäten`;
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Activities→Aktivitäten): "${obj.name}" -> "${baseName}" + " Aktivitäten" = "${translation}"`);
                }
            }

            // Strategy 15: If name ends with " Wizard", try translating as "Assistent"
            // Example: "CRM Connection Setup Wizard" -> "CRM Connection Setup" + "Assistent"
            // Wizard pages use "Assistent" in German
            if (!translation && obj.name.endsWith(' Wizard')) {
                const baseName = obj.name.replace(' Wizard', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                const baseTranslation = translations.get(fallbackKey);

                if (baseTranslation) {
                    // Combine base translation with "Assistent" (German for "Wizard")
                    translation = `${baseTranslation} Assistent`;
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (Wizard→Assistent): "${obj.name}" -> "${baseName}" + " Assistent" = "${translation}"`);
                }
            }

            // Strategy 16: If name starts with "APIV2 -", try removing the API prefix
            // Example: "APIV2 - Sales Quotes" -> "Sales Quotes"
            // API pages have this technical prefix which is not in translations
            if (!translation && obj.name.startsWith('APIV2 - ')) {
                const baseName = obj.name.replace('APIV2 - ', '');
                const fallbackKey = `${obj.type}-${baseName}`;
                translation = translations.get(fallbackKey);

                if (translation) {
                    usedFallback = true;
                    // CustomConsole.customConsole.appendLine(`[AL Navigator] 🔄 Fallback (APIV2): "${obj.name}" -> "${baseName}" = "${translation}"`);
                }
            }

            // Note: Generic keyword-based fallback removed because it caused too many false matches
            // (e.g., "Email Editor" matching "Email Viewer", "Job List" matching "Inventory List")
            // Only specific, tested fallback strategies are kept
        }

        // Debug: Log the first few lookups
        if (combinedObjects.indexOf(obj) < 3) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Lookup: ${translationKey} -> ${translation || 'NOT FOUND'}${usedFallback ? ' (via fallback)' : ''}`);
        }

        const nameWithTranslation = translation
            ? `${obj.name} / ${translation}`
            : obj.name;

        return {
            label: `${obj.type} | ID: ${obj.id} | ${nameWithTranslation}`,
            detail: `App: ${obj.appName || 'Unknown'}`,
            id: obj.id,
            type: obj.type,
            translation: translation, // Store translation for later analysis
        } as any; // Cast to any to add custom properties
    });

    // Log all objects without translation for pattern analysis
    const untranslatedObjects = quickPick.items.filter((item: any) => !item.translation);
    if (untranslatedObjects.length > 0) {
        CustomConsole.customConsole.appendLine(`\n[AL Navigator] ❌ ${untranslatedObjects.length} objects without translation:`);
        untranslatedObjects.forEach((item: any) => {
            CustomConsole.customConsole.appendLine(`   ${item.type} | "${item.label.split(' | ')[2]}" (ID: ${item.id}, App: ${item.detail.replace('App: ', '')})`);
        });
        CustomConsole.customConsole.appendLine(`[AL Navigator] ===\n`);
    }

    // Return a promise that handles object selection
    return new Promise((resolve) => {
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0] as any;
            quickPick.hide();
            resolve(selected);
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve(undefined);
        });

        quickPick.show();
    });
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

// Extract objects from a single .app file (used for incremental cache updates)
async function extractObjectsFromSingleAppFile(
    appFilePath: string,
    appFileName: string
): Promise<{ id: number; name: string; type: string; appName: string }[]> {
    const objects: { id: number; name: string; type: string; appName: string }[] = [];
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
                        objects.push({ id, name, type: capitalize(type), appName: appFileName });
                        objectCount++;
                    }
                }
            }
        }
        CustomConsole.customConsole.appendLine(`[AL Navigator] Extracted ${objectCount} objects from ${appFileName}`);
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error processing ${appFileName}: ${error.message}`);
        throw error;
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

// Detect most common language from XLF files in .app packages
// Returns the language that appears most frequently across all .app files
async function detectMostCommonLanguage(folderPath: string): Promise<string | undefined> {
    const languageCounts = new Map<string, number>();

    const alpackagesFolderPath = getAlPackagesFolder(folderPath);
    if (!alpackagesFolderPath) {
        return undefined;
    }

    let appFiles: string[];
    try {
        appFiles = fs.readdirSync(alpackagesFolderPath).filter(file => file.endsWith('.app'));
    } catch (error) {
        return undefined;
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔍 Analyzing ${appFiles.length} .app files to determine most common translation language...`);

    // Scan each .app file and count language occurrences
    for (const file of appFiles) {
        const appFilePath = path.join(alpackagesFolderPath, file);
        const cleanedAppFilePath = path.join(path.dirname(appFilePath), `${path.basename(appFilePath, '.app')}_lang_detect_temp.zip`);

        try {
            await removeHeaderFromAppFile(appFilePath, cleanedAppFilePath);
            const zip = new AdmZip(cleanedAppFilePath);
            const entries = zip.getEntries();

            for (const entry of entries) {
                // Find XLF files, but EXCLUDE *.g.xlf (generated base files)
                if (entry.entryName.includes('Translations/') &&
                    entry.entryName.endsWith('.xlf') &&
                    !entry.entryName.endsWith('.g.xlf')) {

                    // Extract language code from filename
                    // Examples: "Base Application.de-DE.xlf" -> "de-DE"
                    //           "System Application.fr-FR.xlf" -> "fr-FR"
                    const filename = path.basename(entry.entryName);
                    const langMatch = filename.match(/\.([a-z]{2}-[A-Z]{2})\.xlf$/);
                    if (langMatch) {
                        const lang = langMatch[1].toLowerCase();
                        languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
                    }
                }
            }
        } catch (error) {
            // Silently skip problematic .app files during language detection
        } finally {
            if (fs.existsSync(cleanedAppFilePath)) {
                try {
                    fs.unlinkSync(cleanedAppFilePath);
                } catch { /* ignore */ }
            }
        }
    }

    if (languageCounts.size === 0) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] ℹ️  No translation files found in any .app package`);
        return undefined;
    }

    // Find the most common language
    let mostCommonLanguage: string | undefined;
    let maxCount = 0;

    for (const [lang, count] of languageCounts.entries()) {
        CustomConsole.customConsole.appendLine(`[AL Navigator]   📊 ${lang.toUpperCase()}: ${count} file(s)`);
        if (count > maxCount) {
            maxCount = count;
            mostCommonLanguage = lang;
        }
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] 🎯 Most common language: ${mostCommonLanguage?.toUpperCase()} (${maxCount} files)`);
    return mostCommonLanguage;
}// Extracts translations from XLF files in .app packages for a specific language
async function extractTranslationsFromAppFiles(folderPath: string, selectedLanguage?: string): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    if (selectedLanguage) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Extracting translations for language: ${selectedLanguage}`);
    } else {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Auto-detecting translations from .app files`);
    }

    // Get the .alpackages folder path
    const alpackagesFolderPath = getAlPackagesFolder(folderPath);
    if (!alpackagesFolderPath) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] No .alpackages folder found for translation extraction`);
        return translations;
    }

    let appFiles: string[];
    try {
        appFiles = fs.readdirSync(alpackagesFolderPath).filter(file => file.endsWith('.app'));
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error reading .alpackages folder: ${error.message}`);
        return translations;
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Searching ${appFiles.length} .app files for XLF translations`);

    // Process each app file
    for (const file of appFiles) {
        const appFilePath = path.join(alpackagesFolderPath, file);
        const cleanedAppFilePath = path.join(path.dirname(appFilePath), `${path.basename(appFilePath, '.app')}_xlf_temp.zip`);

        try {
            await removeHeaderFromAppFile(appFilePath, cleanedAppFilePath);
            const zip = new AdmZip(cleanedAppFilePath);
            const entries = zip.getEntries();

            // Look for XLF files matching the selected language, or ALL if no language specified
            let foundXlfInThisApp = false;
            for (const entry of entries) {
                // EXCLUDE *.g.xlf (generated base files - not translations!)
                if (entry.entryName.includes('Translations/') &&
                    entry.entryName.endsWith('.xlf') &&
                    !entry.entryName.endsWith('.g.xlf')) {

                    // If a specific language is selected, only process matching files (case-insensitive)
                    if (selectedLanguage) {
                        const filename = path.basename(entry.entryName).toLowerCase();
                        const searchPattern = `.${selectedLanguage.toLowerCase()}.xlf`;
                        if (!filename.includes(searchPattern)) {
                            continue; // Skip XLF files that don't match the selected language
                        }
                    }

                    CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Found XLF file: ${entry.entryName} in ${file}`);
                    foundXlfInThisApp = true;

                    try {
                        const xlfContent = entry.getData().toString('utf-8');
                        const beforeCount = translations.size;
                        parseXlfForObjectTranslations(xlfContent, translations);
                        const addedCount = translations.size - beforeCount;
                        CustomConsole.customConsole.appendLine(`[AL Navigator]   Added ${addedCount} translations from this XLF file`);
                    } catch (parseError) {
                        CustomConsole.customConsole.appendLine(`[AL Navigator] ✗ Error parsing XLF file ${entry.entryName}: ${parseError.message}`);
                    }
                }
            }

            if (!foundXlfInThisApp) {
                CustomConsole.customConsole.appendLine(`[AL Navigator] No XLF translation files found in ${file}`);
            }
        } catch (error) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] Error processing ${file} for translations: ${error.message}`);
        } finally {
            // Clean up temp file
            if (fs.existsSync(cleanedAppFilePath)) {
                try {
                    fs.unlinkSync(cleanedAppFilePath);
                } catch (unlinkError) {
                    CustomConsole.customConsole.appendLine(`[AL Navigator] Warning: Could not delete temp file ${cleanedAppFilePath}`);
                }
            }
        }
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] Extracted ${translations.size} object translations`);
    return translations;
}

// Parse XLF content to extract object name translations (Page and Report captions)
function parseXlfForObjectTranslations(xlfContent: string, translations: Map<string, string>): void {
    // XLF structure example:
    // <trans-unit id="Page 123456789 - Property 2879900210" ...>
    //   <source>Customers</source>  <- This is the Caption text
    //   <target>Debitoren</target>
    //   <note from="Developer" annotates="general">Caption</note>
    //   <note from="Xliff Generator">Page Customer List - Property Caption</note>  <- This contains the actual object name!
    // </trans-unit>

    // Match trans-units for Page and Report captions
    const transUnitRegex = /<trans-unit[^>]*id="(Page|Report)\s+\d+[^"]*"[^>]*>([\s\S]*?)<\/trans-unit>/gi;
    let match;

    while ((match = transUnitRegex.exec(xlfContent)) !== null) {
        const objectType = match[1]; // "Page" or "Report"
        const transUnitContent = match[2];

        // Check if this is a Caption property (the object's main name)
        if (transUnitContent.includes('Property Caption') || transUnitContent.includes('annotates="general">Caption')) {
            // Extract source (Caption text) and target (translated caption)
            const sourceMatch = /<source[^>]*>(.*?)<\/source>/i.exec(transUnitContent);
            const targetMatch = /<target[^>]*>(.*?)<\/target>/i.exec(transUnitContent);

            // Extract the actual object name from the Xliff Generator note
            // Format: "Page Customer List - Property Caption" or "Report Sales Invoice - Property Caption"
            const noteMatch = /<note from="Xliff Generator"[^>]*>(Page|Report)\s+([^-]+?)\s+-\s+Property Caption<\/note>/i.exec(transUnitContent);

            if (sourceMatch && sourceMatch[1] && targetMatch && targetMatch[1]) {
                const captionText = sourceMatch[1].trim(); // e.g., "Customers"
                const translation = targetMatch[1].trim(); // e.g., "Debitoren"

                // Store translation with Caption as key (1for objects where Caption = Name)
                const captionKey = `${objectType}-${captionText}`;
                translations.set(captionKey, translation);

                // Debug: Log Location-related entries to understand the XLF structure
                if (captionText.toLowerCase().includes('location') && captionText.toLowerCase() !== 'location') {
                    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔍 Location XLF entry found:`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator]   Caption: "${captionText}"`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator]   Translation: "${translation}"`);
                    CustomConsole.customConsole.appendLine(`[AL Navigator]   Note match: ${noteMatch ? `YES - "${noteMatch[2].trim()}"` : 'NO'}`);
                    if (!noteMatch) {
                        // Try to find ANY note to see what's in there
                        const anyNoteMatch = /<note from="Xliff Generator"[^>]*>(.*?)<\/note>/i.exec(transUnitContent);
                        if (anyNoteMatch) {
                            CustomConsole.customConsole.appendLine(`[AL Navigator]   Full note content: "${anyNoteMatch[1]}"`);
                        }
                    }
                }

                // If we found the object name in the note, also store with object name as key
                if (noteMatch && noteMatch[2]) {
                    const objectName = noteMatch[2].trim(); // e.g., "Customer List"
                    const objectNameKey = `${objectType}-${objectName}`;
                    translations.set(objectNameKey, translation);

                    // Debug: Log when Caption differs from Object Name
                    if (captionText !== objectName) {
                        // Only log occasionally to avoid spam
                        if (Math.random() < 0.1) {
                            CustomConsole.customConsole.appendLine(`[AL Navigator] Translation mapping: "${objectName}" (Caption: "${captionText}") -> "${translation}"`);
                        }
                    }
                }
            }
        }
    }
}

// Extracts translations from XLF files in the workspace's Translations folder
async function extractTranslationsFromWorkspaceXlf(workspaceFolder: string, selectedLanguage?: string): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    const translationsFolderPath = path.join(workspaceFolder, 'Translations');

    // Check if Translations folder exists
    if (!fs.existsSync(translationsFolderPath)) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] No Translations folder found in workspace`);
        return translations;
    }

    try {
        const files = fs.readdirSync(translationsFolderPath);
        const xlfFiles = files.filter(file =>
            file.endsWith('.xlf') &&
            !file.endsWith('.g.xlf') // Exclude generated base files
        );

        if (xlfFiles.length === 0) {
            CustomConsole.customConsole.appendLine(`[AL Navigator] No XLF translation files found in workspace Translations folder`);
            return translations;
        }

        CustomConsole.customConsole.appendLine(`[AL Navigator] 📁 Found ${xlfFiles.length} XLF file(s) in workspace Translations folder`);

        // Process each XLF file
        for (const xlfFile of xlfFiles) {
            // If a specific language is selected, only process matching files
            if (selectedLanguage) {
                const searchPattern = `.${selectedLanguage.toLowerCase()}.xlf`;
                if (!xlfFile.toLowerCase().includes(searchPattern)) {
                    continue; // Skip XLF files that don't match the selected language
                }
            }

            const xlfFilePath = path.join(translationsFolderPath, xlfFile);
            CustomConsole.customConsole.appendLine(`[AL Navigator] ✓ Processing workspace XLF: ${xlfFile}`);

            try {
                const xlfContent = fs.readFileSync(xlfFilePath, 'utf-8');
                const beforeCount = translations.size;
                parseXlfForObjectTranslations(xlfContent, translations);
                const addedCount = translations.size - beforeCount;
                CustomConsole.customConsole.appendLine(`[AL Navigator]   Added ${addedCount} translations from workspace XLF`);
            } catch (parseError) {
                CustomConsole.customConsole.appendLine(`[AL Navigator] ✗ Error parsing workspace XLF ${xlfFile}: ${parseError.message}`);
            }
        }

        CustomConsole.customConsole.appendLine(`[AL Navigator] 📦 Total workspace translations: ${translations.size}`);
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error reading workspace Translations folder: ${error.message}`);
    }

    return translations;
}

// Extracts translations from AL file comments (e.g., Comment = 'DEU="..."')
async function extractTranslationsFromAlFileComments(workspaceFolder: string, selectedLanguage?: string): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    if (!selectedLanguage) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] No language selected - skipping AL comment translation extraction`);
        return translations;
    }

    // Map language codes to comment prefixes
    // Common formats: DEU="...", FRA="...", ENU="...", etc.
    const languageMap: { [key: string]: string } = {
        'de-de': 'DEU',
        'de-at': 'DEU',
        'de-ch': 'DEU',
        'fr-fr': 'FRA',
        'fr-be': 'FRA',
        'fr-ca': 'FRA',
        'fr-ch': 'FRA',
        'en-us': 'ENU',
        'en-gb': 'ENU',
        'en-ca': 'ENU',
        'en-au': 'ENU',
        'es-es': 'ESP',
        'es-mx': 'ESM',
        'it-it': 'ITA',
        'it-ch': 'ITA',
        'nl-nl': 'NLD',
        'nl-be': 'NLB',
        'da-dk': 'DAN',
        'sv-se': 'SVE',
        'nb-no': 'NOR',
        'fi-fi': 'FIN',
        'cs-cz': 'CSY',
        'is-is': 'ISL'
    };

    const languagePrefix = languageMap[selectedLanguage.toLowerCase()];
    if (!languagePrefix) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] No comment prefix mapping found for language: ${selectedLanguage}`);
        return translations;
    }

    CustomConsole.customConsole.appendLine(`[AL Navigator] 🔍 Searching AL files for ${languagePrefix}="..." comment translations`);

    try {
        // Search for all .al files in the workspace
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.al');
        const alFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

        let filesProcessed = 0;
        let translationsFound = 0;

        for (const file of alFiles) {
            const content = fs.readFileSync(file.fsPath, 'utf-8');
            const lines = content.split('\n');

            // Find page and report declarations
            // Example: page 60002 "Dispatcher Prices"
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const objectMatch = /(page|report)\s+(\d+)\s+"([^"]+)"/i.exec(line);

                if (objectMatch) {
                    const objectType = objectMatch[1].toLowerCase(); // "page" or "report"
                    const objectId = objectMatch[2];
                    const objectName = objectMatch[3];

                    // Look for Caption in the next ~20 lines (before we hit layout/actions/triggers)
                    // This ensures we only get the object-level Caption, not control Captions
                    let foundTranslation = false;
                    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                        const checkLine = lines[j];

                        // Stop if we hit layout, actions, or trigger sections
                        if (/^\s*(layout|actions|trigger|var)\s*\{/i.test(checkLine)) {
                            break;
                        }

                        // Look for Caption with comment translation on this line
                        const captionRegex = new RegExp(
                            `Caption\\s*=\\s*'([^']*)'[^;]*Comment\\s*=\\s*'[^']*${languagePrefix}="([^"]*)"`,
                            'i'
                        );

                        const capMatch = captionRegex.exec(checkLine);
                        if (capMatch) {
                            const englishCaption = capMatch[1];
                            const translation = capMatch[2];

                            // Store translation with object type and name
                            const translationKey = `${capitalize(objectType)}-${objectName}`;
                            translations.set(translationKey, translation);
                            translationsFound++;

                            CustomConsole.customConsole.appendLine(
                                `[AL Navigator]   ✓ Found in AL: ${capitalize(objectType)} "${objectName}" -> "${translation}"`
                            );

                            foundTranslation = true;
                            break; // Found the object caption, stop searching
                        }
                    }
                }
            }

            filesProcessed++;
        }

        CustomConsole.customConsole.appendLine(
            `[AL Navigator] 📄 Processed ${filesProcessed} AL files, found ${translationsFound} comment translations`
        );
    } catch (error) {
        CustomConsole.customConsole.appendLine(`[AL Navigator] Error extracting translations from AL comments: ${error.message}`);
    }

    return translations;
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
