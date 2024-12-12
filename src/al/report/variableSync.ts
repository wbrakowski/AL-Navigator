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
        // Parse the AL file to find the associated RDLC layouts
        const alContent = fs.readFileSync(alFilePath, 'utf8');
        const rdlcFilePaths = parseALFileForRDLCLayouts(alContent, alFilePath);

        if (rdlcFilePaths.length === 0) {
            throw new Error('No RDLCLayout properties or rendering layouts found in the AL file.');
        }

        for (const rdlcFilePath of rdlcFilePaths) {
            const normalizedPath = path.normalize(rdlcFilePath);

            if (!fs.existsSync(normalizedPath)) {
                console.warn(`RDLC file not found: ${normalizedPath}`);
                continue;
            }

            const rdlContent = fs.readFileSync(normalizedPath, 'utf8');
            const parser = new xml2js.Parser({ explicitArray: false });
            const builder = new xml2js.Builder();
            const rdlObject = await parser.parseStringPromise(rdlContent);

            const updatedFields = updateDatasetFields(rdlObject, oldName, newName);
            const updatedReferences = updateRDLReferences(rdlObject, oldName, newName);

            if (updatedFields || updatedReferences) {
                const updatedRDLContent = builder.buildObject(rdlObject);
                fs.writeFileSync(normalizedPath, updatedRDLContent);
                console.log(`Updated RDLC file: ${normalizedPath}`);
            }
        }
    }

    function parseALFileForRDLCLayouts(content: string, alFilePath: string): string[] {
        const layouts: string[] = [];

        // Match the traditional `RDLCLayout` property
        const rdlcMatch = content.match(/RDLCLayout\s*=\s*['"](.+?)['"]/);
        if (rdlcMatch) {
            layouts.push(resolvePathFromWorkspace(rdlcMatch[1].trim()));
        }

        // Match `rendering` layouts
        const renderingRegex = /layout\(['"](.+?)['"]\)\s*{[\s\S]*?LayoutFile\s*=\s*['"](.+?)['"]/g;
        let match;
        while ((match = renderingRegex.exec(content)) !== null) {
            layouts.push(resolvePathFromWorkspace(match[2].trim()));
        }

        return layouts;
    }

    function resolvePathFromWorkspace(relativePath: string): string {
        const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
        if (!activeWorkspaceFolder) {
            throw new Error('No active workspace folder found.');
        }

        return path.normalize(path.join(activeWorkspaceFolder, relativePath));
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
                        if (field.$?.Name === oldName) {
                            field.$.Name = newName;
                            updated = true;
                        }
                        if (field.DataField === oldName) {
                            field.DataField = newName;
                            updated = true;
                        }
                        if (field.$?.Name === `${oldName}Format`) {
                            field.$.Name = `${newName}Format`;
                            updated = true;
                        }
                        if (field.DataField === `${oldName}Format`) {
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
                        traverseAndUpdate(value);
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
