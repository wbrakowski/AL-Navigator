import * as vscode from 'vscode';

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