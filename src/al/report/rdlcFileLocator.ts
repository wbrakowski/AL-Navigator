import * as fs from 'fs';
import * as path from 'path';
import * as FolderHelper from '../../files/folderHelper';

export module RdlcFileLocator {
    export function parseALFileForRDLCLayouts(content: string, alFilePath: string): string[] {
        const layouts: string[] = [];

        // Match the traditional `RDLCLayout` property
        const rdlcMatch = content.match(/RDLCLayout\s*=\s*['"](.+?)['"]/);
        if (rdlcMatch) {
            layouts.push(resolvePathFromWorkspace(rdlcMatch[1].trim()));
        }

        // Match `rendering` layouts and extract LayoutFile paths
        const renderingRegex = /layout\(['"].+?['"]\)\s*{\s*LayoutFile\s*=\s*['"](.+?)['"]/g;
        let match;
        while ((match = renderingRegex.exec(content)) !== null) {
            layouts.push(resolvePathFromWorkspace(match[1].trim()));
        }

        return layouts;
    }

    export function resolvePathFromWorkspace(relativePath: string): string {
        const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
        if (!activeWorkspaceFolder) {
            throw new Error('No active workspace folder found.');
        }

        return path.normalize(path.join(activeWorkspaceFolder, relativePath));
    }
}
