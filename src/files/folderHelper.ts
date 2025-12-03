import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getActiveWorkspacePath(): string {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
        return getFirstOpenedFolderPath();
    }

    const documentUri = activeTextEditor.document.uri;
    if (!documentUri) {
        return getFirstOpenedFolderPath();
    }

    const activeWorkspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (!activeWorkspaceFolder) {
        return getFirstOpenedFolderPath();
    }

    return activeWorkspaceFolder.uri.fsPath;
}



function getFirstOpenedFolderPath(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].uri.fsPath; // Return the path of the first folder in the workspaceFolders list
    } else {
        return '';
    }
}

export function stripReportFolder(reportFolder): string {
    let newFolder = '.';
    newFolder += reportFolder.replace(getActiveWorkspacePath(), '');
    newFolder += '\\';
    return newFolder;
}

export function findReportFolder(workspacePath: string): string | undefined {
    const alFolders = ['src', 'app'];

    for (const folder of alFolders) {
        const reportFolder = path.join(workspacePath, folder, 'report');
        const reportsFolder = path.join(workspacePath, folder, 'reports');
        if (fs.existsSync(reportFolder)) {
            return reportFolder;
        }
        else {
            if (fs.existsSync(reportsFolder)) {
                return reportsFolder;
            }
        }
    }
    return undefined;
}

/**
 * Finds the reportextension folder in the workspace for report extensions
 * @param workspacePath Path to the workspace folder
 * @returns Path to reportextension folder or undefined if not found
 */
export function findReportExtensionFolder(workspacePath: string): string | undefined {
    const alFolders = ['src', 'app'];

    for (const folder of alFolders) {
        const reportExtFolder = path.join(workspacePath, folder, 'reportextension');
        const reportExtensionsFolder = path.join(workspacePath, folder, 'reportextensions');
        if (fs.existsSync(reportExtFolder)) {
            return reportExtFolder;
        }
        else {
            if (fs.existsSync(reportExtensionsFolder)) {
                return reportExtensionsFolder;
            }
        }
    }
    return undefined;
}

/**
 * Finds all folders containing .rdl or .rdlc files in the workspace
 * @param workspacePath Path to the workspace folder
 * @returns Array of folder paths containing report layout files
 */
export function findFoldersWithReportLayouts(workspacePath: string): string[] {
    const folders: Set<string> = new Set();

    const searchFolders = (dir: string, depth: number = 0) => {
        // Limit search depth to avoid performance issues
        if (depth > 5) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip node_modules, .git, .alpackages, etc.
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue;
                }

                if (entry.isDirectory()) {
                    searchFolders(fullPath, depth + 1);
                } else if (entry.isFile() && (entry.name.endsWith('.rdl') || entry.name.endsWith('.rdlc'))) {
                    folders.add(dir);
                }
            }
        } catch (error) {
            // Skip folders we can't read
        }
    };

    searchFolders(workspacePath);
    return Array.from(folders).sort();
}

/**
 * Finds all folders containing .al report files in the workspace
 * @param workspacePath Path to the workspace folder
 * @returns Array of folder paths containing AL report files
 */
export function findFoldersWithReportAlFiles(workspacePath: string): string[] {
    const folders: Set<string> = new Set();

    const searchFolders = (dir: string, depth: number = 0) => {
        // Limit search depth to avoid performance issues
        if (depth > 5) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip node_modules, .git, .alpackages, etc.
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue;
                }

                if (entry.isDirectory()) {
                    searchFolders(fullPath, depth + 1);
                } else if (entry.isFile() && entry.name.endsWith('.al')) {
                    // Check if this AL file contains a report or report extension
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        if (/^\s*report\s+\d+/mi.test(content) || /^\s*reportextension\s+\d+/mi.test(content)) {
                            folders.add(dir);
                        }
                    } catch {
                        // Skip files we can't read
                    }
                }
            }
        } catch (error) {
            // Skip folders we can't read
        }
    };

    searchFolders(workspacePath);
    return Array.from(folders).sort();
}

/**
 * Prompts user to select a folder if multiple are found
 * @param folders Array of folder paths
 * @param fileType Type of files ('layout' or 'AL')
 * @returns Selected folder path or undefined if cancelled
 */
export async function promptForFolderSelection(folders: string[], fileType: 'layout' | 'AL'): Promise<string | undefined> {
    if (folders.length === 0) {
        return undefined;
    }

    if (folders.length === 1) {
        return folders[0];
    }

    const workspacePath = getActiveWorkspacePath();
    const items = folders.map(folder => ({
        label: path.basename(folder),
        description: folder.replace(workspacePath, '').substring(1), // Remove leading slash
        detail: folder,
        folder: folder
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Multiple folders with ${fileType} files found. Select the target folder:`
    });

    return selected?.folder;
}

export function getAlPackagesFolder(workspacePath: string): string | undefined {
    // First check the workspace settings for custom package cache paths
    const config = vscode.workspace.getConfiguration('al');
    const packageCachePaths = config.get<string[]>('packageCachePath');

    if (packageCachePaths && packageCachePaths.length > 0) {
        // Try each configured path
        for (const configPath of packageCachePaths) {
            // Resolve the path relative to workspace
            const resolvedPath = path.resolve(workspacePath, configPath);
            if (fs.existsSync(resolvedPath)) {
                return resolvedPath;
            }
        }
    }

    // Fall back to default .alpackages in workspace root if no custom path works
    const defaultPath = path.join(workspacePath, '.alpackages');
    if (fs.existsSync(defaultPath)) {
        return defaultPath;
    }

    return undefined;
}