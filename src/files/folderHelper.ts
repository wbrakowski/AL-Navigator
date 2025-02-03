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