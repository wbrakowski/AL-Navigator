import * as fs from 'fs';
import * as path from 'path';
import { RdlcFileLocator } from './rdlcFileLocator';

export module variableSync {
    export async function syncVariableRename(
        alFilePath: string,
        oldName: string,
        newName: string
    ): Promise<void> {
        const alContent = fs.readFileSync(alFilePath, 'utf8');
        const rdlcFilePaths = RdlcFileLocator.parseALFileForRDLCLayouts(alContent, alFilePath);

        if (rdlcFilePaths.length === 0) {
            throw new Error('No RDLCLayout properties or rendering layouts found in the AL file.');
        }

        for (const rdlcFilePath of rdlcFilePaths) {
            const normalizedPath = path.normalize(rdlcFilePath);

            if (!fs.existsSync(normalizedPath)) {
                console.warn(`RDLC file not found: ${normalizedPath}`);
                continue;
            }

            const rdlLines = fs.readFileSync(normalizedPath, 'utf8').split('\n'); // Read file line by line
            const updatedLines = processRDLCLines(rdlLines, oldName, newName);

            if (updatedLines) {
                fs.writeFileSync(normalizedPath, updatedLines.join('\n'), 'utf8'); // Write back only modified content
                console.log(`Updated RDLC file: ${normalizedPath}`);
            } else {
                console.log(`No changes required for RDLC file: ${normalizedPath}`);
            }
        }
    }

    function processRDLCLines(lines: string[], oldName: string, newName: string): string[] | null {
        let updated = false;

        const updatedLines = lines.map((line) => {
            // Update fields in <Field Name="..."> or <DataField>...</DataField>
            if (
                line.includes(`Name="${oldName}"`) ||
                line.includes(`<DataField>${oldName}</DataField>`) ||
                line.includes(`Name="${oldName}Format"`) || // Check for Format fields
                line.includes(`<DataField>${oldName}Format</DataField>`) // Check for Format fields
            ) {
                updated = true;
                return line.replace(new RegExp(`${oldName}(Format)?`, 'g'), `${newName}$1`); // Replace oldName and Format
            }

            // Update references to Fields!oldName and Fields!oldNameFormat
            if (line.includes(`Fields!${oldName}`) || line.includes(`Fields!${oldName}Format`)) {
                updated = true;
                return line.replace(
                    new RegExp(`Fields!${oldName}(\\.Value|Format)?`, 'g'),
                    `Fields!${newName}$1`
                );
            }

            return line; // Return the line unchanged if no matches are found
        });

        return updated ? updatedLines : null; // Return updated lines only if changes were made
    }
}
