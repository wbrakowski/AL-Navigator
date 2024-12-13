import * as vscode from 'vscode';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as path from 'path';
import * as FolderHelper from '../../files/folderHelper';
import { RdlcFileLocator } from './rdlcFileLocator';

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
        const rdlcFilePaths = RdlcFileLocator.parseALFileForRDLCLayouts(alContent, alFilePath);

        if (rdlcFilePaths.length === 0) {
            vscode.window.showErrorMessage('No RDLCLayout properties or rendering layouts found in the AL file.');
            return;
        }

        for (const rdlFilePath of rdlcFilePaths) {
            if (!fs.existsSync(rdlFilePath)) {
                vscode.window.showErrorMessage(`RDL file not found: ${rdlFilePath}`);
                continue;
            }

            const rdlContent = fs.readFileSync(rdlFilePath, 'utf8');
            const parser = new xml2js.Parser({ explicitArray: false });
            const builder = new xml2js.Builder();

            try {
                const rdlObject = await parser.parseStringPromise(rdlContent);
                const usedFields = extractUsedFields(rdlObject);

                // console.log('Used fields in RDLC:', Array.from(usedFields));

                const { updatedALContent, removedVariables } = updateALFile(alContent, usedFields);

                if (updatedALContent !== alContent) {
                    fs.writeFileSync(alFilePath, updatedALContent);

                    let removalMessage = `Updated AL file: ${path.basename(alFilePath)}`;
                    if (removedVariables.length > 0) {
                        removalMessage += '\nRemoved variables:\n' + removedVariables.map((variable) => `- ${variable}`).join('\n');
                        removalMessage += '\nThe RDLC file will be updated once the build task is run.';
                    }
                    vscode.window.showInformationMessage(removalMessage);
                } else {
                    // console.log('No changes made to AL file.');
                    vscode.window.showInformationMessage('No changes made to AL file because there are no unused variables.');
                }

                const updatedRdlObject = cleanUnusedFields(rdlObject, usedFields);
                if (JSON.stringify(updatedRdlObject) !== JSON.stringify(rdlObject)) {
                    const updatedRdlContent = builder.buildObject(updatedRdlObject);
                    fs.writeFileSync(rdlFilePath, updatedRdlContent);
                    vscode.window.showInformationMessage(`Updated RDL file: ${path.basename(rdlFilePath)}`);
                } else {
                    console.log('No changes made to RDL file.');
                }
            } catch (error) {
                vscode.window.showErrorMessage('Error processing RDLC file: ' + error.message);
            }
        }
    }

    function updateALFile(content: string, usedFields: Set<string>): { updatedALContent: string; removedVariables: string[] } {
        const removedVariables: string[] = [];
        const updatedALContent = content.replace(/column\(([\s\S]*?);[\s\S]*?\)\s*{[\s\S]*?}/g, (match, variable) => {
            // Ensure variable is treated as a string
            const normalizedVariable = String(variable).trim().toLowerCase();
            if (!usedFields.has(normalizedVariable)) {
                removedVariables.push(variable);
                console.log(`Removing unused AL variable: ${variable}`);
                return ''; // Remove the column
            }
            return match; // Keep the column
        });

        return { updatedALContent, removedVariables };
    }


    function extractUsedFields(rdlObject: any): Set<string> {
        const usedFields = new Set<string>();

        function traverseObject(obj: any) {
            if (typeof obj === 'object') {
                for (const key in obj) {
                    const value = obj[key];
                    if (typeof value === 'string') {
                        const matches = value.match(/Fields!([a-zA-Z0-9_]+)(?:\.Value|Format)?/g);
                        if (matches) {
                            matches.forEach((match) => {
                                const fieldName = match.replace(/Fields!|\.Value|Format/g, '').trim().toLowerCase();
                                usedFields.add(fieldName);
                            });
                        }
                    } else if (typeof value === 'object') {
                        traverseObject(value);
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

        return rdlObject;
    }
}
