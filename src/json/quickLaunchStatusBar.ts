import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFile } from '../al/alFile';
import { getCurrentStartupObjectName } from './launchjson_updater';
import * as jsonc from 'jsonc-parser';

// Class to manage the Quick Launch Status Bar button
export class QuickLaunchStatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        // Create status bar item with high priority (appears on the left)
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );

        this.statusBarItem.command = 'extension.selectStartupObjectId';
        this.statusBarItem.tooltip = 'Select Startup Object: Click to change startup object';

        this.updateStatusBarText();
        this.statusBarItem.show();
    }

    // Update the status bar text with current startup object
    async updateStatusBarText(): Promise<void> {
        const startupObject = await this.getCurrentStartupObject();

        if (startupObject) {
            // Show name if available, otherwise just type and ID
            if (startupObject.name) {
                this.statusBarItem.text = `$(rocket) ${startupObject.type} ${startupObject.id}: ${startupObject.name}`;
            } else {
                this.statusBarItem.text = `$(rocket) ${startupObject.type} ${startupObject.id}`;
            }
            this.statusBarItem.tooltip = `Select Startup Object: ${startupObject.type} ${startupObject.id}${startupObject.name ? ` - ${startupObject.name}` : ''}\nClick to change`;
        } else {
            this.statusBarItem.text = `$(rocket) No Startup`;
            this.statusBarItem.tooltip = 'Select Startup Object: No startup object set\nClick to set one';
        }
    }

    // Get the current startup object from launch.json
    private async getCurrentStartupObject(): Promise<{ id: number; type: string; name?: string } | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            // Find the first launch.json file
            const launchJsonFiles = await vscode.workspace.findFiles('**/.vscode/launch.json', '**/node_modules/**');
            if (launchJsonFiles.length === 0) {
                return null;
            }

            // Read the first launch.json file and parse with comment support
            const launchJsonPath = launchJsonFiles[0].fsPath;
            const launchJsonContent = await fs.promises.readFile(launchJsonPath, 'utf8');
            const parseErrors: jsonc.ParseError[] = [];
            const launchJson = jsonc.parse(launchJsonContent, parseErrors);

            if (parseErrors.length > 0) {
                console.error('Error parsing launch.json:', parseErrors);
                return null;
            }

            // Find the first configuration with a startupObjectId
            if (launchJson.configurations && Array.isArray(launchJson.configurations)) {
                for (const config of launchJson.configurations) {
                    if (config.startupObjectId) {
                        const id = config.startupObjectId;
                        const type = config.startupObjectType || 'Page'; // Default to Page if not specified

                        // Get the saved object name from extension state
                        const savedObject = getCurrentStartupObjectName();
                        const name = (savedObject && savedObject.id === id && savedObject.type === type)
                            ? savedObject.name
                            : undefined;

                        return { id, type, name };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error reading startup object from launch.json:', error);
            return null;
        }
    }


    // Show the status bar item
    show(): void {
        this.statusBarItem.show();
    }

    // Hide the status bar item
    hide(): void {
        this.statusBarItem.hide();
    }

    // Dispose the status bar item
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
