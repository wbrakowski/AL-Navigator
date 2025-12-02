import * as fs from 'fs';
import * as path from 'path';
import * as FolderHelper from '../../files/folderHelper';

export module RdlcFileLocator {
    export function parseALFileForRDLCLayouts(content: string, alFilePath: string): string[] {
        const layouts: string[] = [];

        // Match the traditional `RDLCLayout` property
        const rdlcMatch = content.match(/RDLCLayout\s*=\s*['"](.+?)['"]/);
        if (rdlcMatch) {
            const resolvedPath = resolveLayoutPath(rdlcMatch[1].trim(), alFilePath);
            if (resolvedPath) {
                layouts.push(resolvedPath);
            }
        }

        // Match `rendering` layouts and extract LayoutFile paths
        const renderingRegex = /layout\s*\(\s*['"].+?['"]\s*\)\s*{[^}]*LayoutFile\s*=\s*['"](.+?)['"]/g;
        let match;
        while ((match = renderingRegex.exec(content)) !== null) {
            const resolvedPath = resolveLayoutPath(match[1].trim(), alFilePath);
            if (resolvedPath) {
                layouts.push(resolvedPath);
            }
        }

        return layouts;
    }

    /**
     * Resolves a layout file path from various possible formats
     * Tries multiple resolution strategies to find the actual file
     */
    function resolveLayoutPath(layoutPath: string, alFilePath: string): string | null {
        // Remove any leading './' or '../' and backslashes
        const cleanPath = layoutPath.replace(/\\/g, '/');

        // Strategy 1: Relative to workspace root
        const workspacePath = FolderHelper.getActiveWorkspacePath();
        if (workspacePath) {
            const absolutePath1 = path.normalize(path.join(workspacePath, cleanPath));
            if (fs.existsSync(absolutePath1)) {
                return absolutePath1;
            }
        }

        // Strategy 2: Relative to the AL file's directory
        const alFileDir = path.dirname(alFilePath);
        const absolutePath2 = path.normalize(path.join(alFileDir, cleanPath));
        if (fs.existsSync(absolutePath2)) {
            return absolutePath2;
        }

        // Strategy 3: Check if it's already an absolute path
        if (path.isAbsolute(cleanPath)) {
            const normalizedPath = path.normalize(cleanPath);
            if (fs.existsSync(normalizedPath)) {
                return normalizedPath;
            }
        }

        // Strategy 4: Try with different extensions (.rdl vs .rdlc)
        if (workspacePath) {
            const withoutExt = cleanPath.replace(/\.(rdl|rdlc)$/i, '');
            const absoluteRdl = path.normalize(path.join(workspacePath, withoutExt + '.rdl'));
            const absoluteRdlc = path.normalize(path.join(workspacePath, withoutExt + '.rdlc'));

            if (fs.existsSync(absoluteRdl)) {
                return absoluteRdl;
            }
            if (fs.existsSync(absoluteRdlc)) {
                return absoluteRdlc;
            }
        }

        // If we can't find the file, return the workspace-relative path
        // (so the error message shows the expected location)
        if (workspacePath) {
            return path.normalize(path.join(workspacePath, cleanPath));
        }

        return null;
    }

    export function resolvePathFromWorkspace(relativePath: string): string {
        const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
        if (!activeWorkspaceFolder) {
            throw new Error('No active workspace folder found.');
        }

        return path.normalize(path.join(activeWorkspaceFolder, relativePath));
    }
}
