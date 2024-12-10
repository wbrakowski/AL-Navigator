import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as FolderHelper from '../../files/folderHelper';

export module variableSync {
    export async function syncVariableRename(
        alFilePath: string,
        oldName: string,
        newName: string
    ): Promise<void> {
        // console.log(`Synchronizing variable rename in RDLC file: ${oldName} -> ${newName}`);

        // Parse the AL file to find the associated RDLC file
        const alContent = fs.readFileSync(alFilePath, 'utf8');
        const rdlcFileName = parseALFileForRDLCLayout(alContent);

        if (!rdlcFileName) {
            throw new Error('No RDLCLayout property found in the AL file.');
        }

        // Locate the RDLC file
        const rdlcFilePath = locateRDLFile(alFilePath, rdlcFileName);
        if (!rdlcFilePath) {
            throw new Error(`RDLC file not found: ${rdlcFileName}`);
        }

        // Read and parse the RDLC file
        const rdlContent = fs.readFileSync(rdlcFilePath, 'utf8');
        const parser = new xml2js.Parser({ explicitArray: false });
        const builder = new xml2js.Builder();

        const rdlObject = await parser.parseStringPromise(rdlContent);

        // Update Dataset Fields (Field Name and DataField)
        const updatedFields = updateDatasetFields(rdlObject, oldName, newName);

        // Update References in RDLC (Fields!<name>.Value)
        const updatedReferences = updateRDLReferences(rdlObject, oldName, newName);

        // Save the updated RDLC file only if changes were made
        if (updatedFields || updatedReferences) {
            const updatedRDLContent = builder.buildObject(rdlObject);
            fs.writeFileSync(rdlcFilePath, updatedRDLContent);
        }
    }

    function parseALFileForRDLCLayout(content: string): string | null {
        const match = content.match(/RDLCLayout\s*=\s*['"](.+?)['"]/);
        return match ? match[1].trim() : null;
    }

    function locateRDLFile(alFilePath: string, rdlcFileName: string): string | null {
        const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
        if (!activeWorkspaceFolder) {
            throw new Error('No active workspace folder found.');
        }

        let reportFolder = FolderHelper.findReportFolder(activeWorkspaceFolder);
        if (!reportFolder) {
            reportFolder = activeWorkspaceFolder;
        }

        const rdlcFilePath = path.join(reportFolder, rdlcFileName.trim());
        return fs.existsSync(rdlcFilePath) ? rdlcFilePath : null;
    }

    function updateDatasetFields(rdlObject: any, oldName: string, newName: string): boolean {
        let updated = false;

        if (rdlObject.Report?.DataSets?.DataSet) {
            const dataSets = Array.isArray(rdlObject.Report.DataSets.DataSet)
                ? rdlObject.Report.DataSets.DataSet
                : [rdlObject.Report.DataSets.DataSet];

            for (const dataSet of dataSets) {
                if (dataSet.Fields?.Field) {
                    const fields = Array.isArray(dataSet.Fields.Field)
                        ? dataSet.Fields.Field
                        : [dataSet.Fields.Field];

                    for (const field of fields) {
                        // Update Field Name
                        if (field.$?.Name === oldName) {
                            // console.log(`Updating Field Name: ${field.$.Name} -> ${newName}`);
                            field.$.Name = newName;
                            updated = true;
                        }
                        // Update DataField
                        if (field.DataField === oldName) {
                            // console.log(`Updating DataField: ${field.DataField} -> ${newName}`);
                            field.DataField = newName;
                            updated = true;
                        }

                        // Handle Format fields
                        if (field.$?.Name === `${oldName}Format`) {
                            // console.log(`Updating Format Field Name: ${field.$.Name} -> ${newName}Format`);
                            field.$.Name = `${newName}Format`;
                            updated = true;
                        }
                        if (field.DataField === `${oldName}Format`) {
                            // console.log(`Updating Format DataField: ${field.DataField} -> ${newName}Format`);
                            field.DataField = `${newName}Format`;
                            updated = true;
                        }
                    }
                }
            }
        }

        return updated;
    }

    function updateRDLReferences(rdlObject: any, oldName: string, newName: string): boolean {
        let updated = false;

        function traverseAndUpdate(obj: any): void {
            if (typeof obj === 'object') {
                for (const key in obj) {
                    const value = obj[key];
                    if (typeof value === 'string') {
                        const updatedValue = value.replace(
                            new RegExp(`Fields!${oldName}(\\.Value)?`, 'g'),
                            `Fields!${newName}$1`
                        );

                        if (updatedValue !== value) {
                            obj[key] = updatedValue;
                            updated = true;
                        }
                    } else if (typeof value === 'object') {
                        traverseAndUpdate(value); // Recursively traverse nested objects
                    }
                }
            }
        }

        if (rdlObject.Report) {
            traverseAndUpdate(rdlObject.Report);
        }

        return updated;
    }
}
