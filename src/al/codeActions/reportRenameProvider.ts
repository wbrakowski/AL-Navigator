import * as vscode from 'vscode';
import { variableSync } from './../report/variableSync';

export class ReportRenameProvider implements vscode.RenameProvider {
    public async provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
    ): Promise<vscode.WorkspaceEdit | null> {
        // console.log('Renaming variable...');
        const alFilePath = document.uri.fsPath;

        if (!this.isReportFile(document)) {
            // vscode.window.showErrorMessage('Rename is only supported for AL Report files.');
            return null;
        }

        // Ensure the cursor is inside a column within a dataitem
        if (!this.isInsideColumn(document, position)) {
            // vscode.window.showErrorMessage(
            //     'Rename is only supported for columns within dataitems in the dataset.'
            // );
            return null;
        }

        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            // vscode.window.showErrorMessage('Please select a valid variable to rename.');
            return null;
        }

        const oldName = document.getText(range);

        if (!this.isValidVariableName(newName)) {
            vscode.window.showErrorMessage(`Invalid variable name: "${newName}".`);
            return null;
        }



        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.replace(document.uri, range, newName);

        let rdlUpdated = false;

        try {
            // Synchronize changes with the RDLC file
            await variableSync.syncVariableRename(alFilePath, oldName, newName);
            rdlUpdated = true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to synchronize with RDLC file: ${error.message}`);
            console.error(error);
        }

        if (rdlUpdated) {
            vscode.window.showInformationMessage(
                `Renamed '${oldName}' to '${newName}' in both the AL file and the RDLC file.`
            );
        } else {
            vscode.window.showInformationMessage(
                `Renamed '${oldName}' to '${newName}' in the AL file. Note: RDLC update failed.`
            );
        }

        return workspaceEdit;
    }

    public async prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Range | null> {
        // console.log('Preparing rename operation...');
        if (!this.isReportFile(document)) {
            vscode.window.showErrorMessage('Rename is only supported for AL Report files.');
            return null;
        }

        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            vscode.window.showErrorMessage('Please select a valid column to rename.');
            return null;
        }

        // Ensure the cursor is inside a column within a dataitem
        if (!this.isInsideColumn(document, position)) {
            vscode.window.showErrorMessage(
                'Rename is only supported for columns within dataitems in the dataset.'
            );
            return null;
        }

        return range;
    }

    private isReportFile(document: vscode.TextDocument): boolean {
        return document.languageId === 'al' && document.getText().includes('report');
    }

    private isValidVariableName(name: string): boolean {
        const variableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return variableNameRegex.test(name);
    }

    private isInsideColumn(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Get the current line
        const currentLine = document.lineAt(position.line).text.trim();

        // Check if the current line is part of a column definition
        if (!currentLine.startsWith('column(')) {
            return false;
        }

        // Ensure it's inside a dataset and a dataitem block
        let insideDataset = false;
        let insideDataitem = false;

        for (let i = position.line; i >= 0; i--) {
            const lineText = document.lineAt(i).text.trim();

            if (lineText.startsWith('dataset')) {
                insideDataset = true;
            }

            if (lineText.startsWith('dataitem(')) {
                insideDataitem = true;
            }

            if (insideDataset && insideDataitem) {
                return true;
            }
        }

        return false;
    }
}
