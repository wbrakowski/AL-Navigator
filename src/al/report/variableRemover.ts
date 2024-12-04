import * as vscode from 'vscode';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as path from 'path';
import * as FolderHelper from '../../files/folderHelper';

export module variableRemover {
    export function removeUnusedVariablesFromReportDataset() {
        const editor = vscode.window.activeTextEditor;

        if (!editor || !editor.document.fileName.endsWith('.al')) {
            vscode.window.showErrorMessage('Please open an AL file.');
            return;
        }

        processALAndRDLFiles(editor.document.uri.fsPath);
    }

    async function processALAndRDLFiles(alFilePath: string) {
        const alContent = fs.readFileSync(alFilePath, 'utf8');
        const { rdlcFileName, variables } = parseALFile(alContent);
    
        if (!rdlcFileName) {
            vscode.window.showErrorMessage('No RDLCLayout property found in the AL file.');
            return;
        }
    
        const rdlFilePath = locateRDLFile(alFilePath, rdlcFileName);
        if (!rdlFilePath) {
            return;
        }
    
        const rdlContent = fs.readFileSync(rdlFilePath, 'utf8');
        const parser = new xml2js.Parser({ explicitArray: false });
        const builder = new xml2js.Builder();
    
        try {
            const rdlObject = await parser.parseStringPromise(rdlContent);
            const usedFields = extractUsedFields(rdlObject);
    
            console.log('Used fields in RDLC:', Array.from(usedFields)); // Debugging log
            console.log('Variables in AL file:', variables); // Debugging log
    
            const { updatedALContent, removedVariables } = updateALFile(alContent, usedFields, variables);
    
            // Check if AL file was actually updated
            if (updatedALContent !== alContent) {
                fs.writeFileSync(alFilePath, updatedALContent);
    
                let removalMessage = `Updated AL file: ${path.basename(alFilePath)}`;
                if (removedVariables.length > 0) {
                    removalMessage += '\nRemoved variables:\n' + removedVariables.map((variable) => `- ${variable}`).join('\n');
                }
                vscode.window.showInformationMessage(removalMessage);
            } else {
                console.log('No changes made to AL file.');
                vscode.window.showInformationMessage('No changes made to AL file because there are no unused variables.');
            }
    
            // Process RDLC file
            const updatedRdlContent = builder.buildObject(rdlObject);
    
            // Check if RDLC file was actually updated
            if (updatedRdlContent !== rdlContent) {
                fs.writeFileSync(rdlFilePath, updatedRdlContent);
                vscode.window.showInformationMessage(`Updated RDL file: ${rdlcFileName}`);
            } else {
                console.log('No changes made to RDL file.');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Error processing RDLC file: ' + error.message);
        }
    }
    



    function parseALFile(content: string) {
        const rdlcMatch = content.match(/RDLCLayout\s*=\s*['"](.+?)['"]/);
        const rdlcFileName = rdlcMatch ? rdlcMatch[1].trim() : null;

        const variablesMatch = [...content.matchAll(/column\(\s*([^;]+?)\s*;/g)];
        const variables = variablesMatch.map((match) => match[1].trim().toLowerCase()); // Normalize to lowercase

        return { rdlcFileName, variables };
    }

    function updateALFile(content: string, usedFields: Set<string>, variables: string[]): { updatedALContent: string; removedVariables: string[] } {
        const removedVariables: string[] = [];
        const updatedALContent = content.replace(/column\(\s*([^;]+?)\s*;.+?\)\s*{.+?}/gs, (match, variable) => {
            const normalizedVariable = variable.trim().toLowerCase();
            if (!usedFields.has(normalizedVariable)) {
                removedVariables.push(variable); // Track removed variable
                console.log(`Removing unused AL variable: ${variable}`); // Debugging log
                return ''; // Remove the column
            }
            return match; // Keep the column
        });

        return { updatedALContent, removedVariables };
    }

    function locateRDLFile(alFilePath: string, rdlcFileName: string): string | null {
        const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
        if (!activeWorkspaceFolder) {
            vscode.window.showErrorMessage('No active workspace folder found.');
            return null;
        }

        let reportFolder = FolderHelper.findReportFolder(activeWorkspaceFolder);
        if (!reportFolder) {
            reportFolder = activeWorkspaceFolder;
        }

        const rdlFilePath = path.join(reportFolder, rdlcFileName.trim());
        if (!fs.existsSync(rdlFilePath)) {
            vscode.window.showErrorMessage(`RDL file not found: ${rdlcFileName} in ${reportFolder}`);
            return null;
        }

        return rdlFilePath;
    }

    function extractUsedFields(rdlObject: any): Set<string> {
        const usedFields = new Set<string>();

        function traverseObject(obj: any) {
            if (typeof obj === 'object') {
                for (const key in obj) {
                    const value = obj[key];
                    if (typeof value === 'string') {
                        const matches = value.match(/Fields!([a-zA-Z0-9_]+)\.Value/g);
                        if (matches) {
                            matches.forEach((match) => {
                                const fieldName = match.replace(/Fields!|\.Value/g, '').trim().toLowerCase();
                                usedFields.add(fieldName);
                            });
                        }
                    } else if (typeof value === 'object') {
                        traverseObject(value); // Recursively traverse nested objects
                    }
                }
            }
        }

        if (rdlObject.Report) {
            traverseObject(rdlObject.Report);
        }

        return usedFields;
    }

    function cleanUnusedFields(rdlObject: any, usedFields: Set<string>) {
        if (rdlObject.Report && rdlObject.Report.DataSets) {
            const datasets = Array.isArray(rdlObject.Report.DataSets.DataSet)
                ? rdlObject.Report.DataSets.DataSet
                : [rdlObject.Report.DataSets.DataSet];

            for (const dataset of datasets) {
                if (dataset.Fields && dataset.Fields.Field) {
                    const fieldsArray = Array.isArray(dataset.Fields.Field)
                        ? dataset.Fields.Field
                        : [dataset.Fields.Field];

                    dataset.Fields.Field = fieldsArray.filter((field: any) => {
                        const fieldName = field.Name?.trim().toLowerCase() || field.DataField?.trim().toLowerCase();
                        if (!fieldName) {
                            console.warn('Encountered a field without a Name or DataField property:', field);
                            return false;
                        }
                        return usedFields.has(fieldName);
                    });

                    if (dataset.Fields.Field.length === 1) {
                        dataset.Fields.Field = dataset.Fields.Field[0];
                    }
                }
            }
        }
    }
}
