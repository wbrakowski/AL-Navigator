import * as vscode from 'vscode';
import * as fs from 'fs';
import { ALObject } from './alObject';
import { StringFunctions } from '../additional/stringFunctions';

export class ALFile {
    public uri: vscode.Uri;
    public filePath: string;
    public fileName: string;
    public fileText: string;
    public alObject: ALObject = new ALObject();
    public procedures: string[] = new Array();

    constructor(file: vscode.Uri) {
        this.uri = file;
        this.filePath = file.fsPath;
        this.fileName = this.getFileNameFromPath(this.filePath);
        this.fileText = this.getTextFromFile();
        this.getObjectInfoFromText();
    }

    private getFileNameFromPath(path: string): string {
        return path.replace(/^.*[\\\/]/, '');
    }

    private getTextFromFile(): string {
        return fs.readFileSync(this.uri.fsPath).toString();
    }

    public procedureExistsInFile(procedureName: string): boolean {
        return (this.procedures.includes(procedureName));
    }

    private getObjectInfoFromText() {
        // Check if file starts with namespace declaration
        // If so, we need to find the object declaration in subsequent lines
        const lines = this.fileText.split('\n');
        let objectDeclarationLine = lines[0];

        // Check if first line is a namespace declaration
        const namespacePattern = /^\s*namespace\s+[\w.]+\s*;/i;
        if (namespacePattern.test(lines[0])) {
            // Find the first line that contains an object type after the namespace
            for (let i = 1; i < Math.min(lines.length, 10); i++) {
                if (lines[i].match(/^\s*(codeunit|page|pagecustomization|pageextension|report|table|tableextension|xmlport)\s+/i)) {
                    objectDeclarationLine = lines[i];
                    break;
                }
            }
        }

        var patternObjectType = new RegExp('(codeunit |page |pagecustomization |pageextension |report |table |tableextension |xmlport)', "i");
        let procedureNamePattern = '[\\w]*';
        var objectNamePattern = '"[^"]*"'; // All characters except "
        var objectNameNoQuotesPattern = '[\\w]*';
        var patternProcedure = new RegExp(`(procedure) +(${procedureNamePattern})`, "gi");
        let objectTypeArr = objectDeclarationLine.match(patternObjectType);
        let procedureArr = this.fileText.match(patternProcedure);

        if (!objectTypeArr) {
            return;
        }

        if (objectTypeArr) {
            switch (objectTypeArr[0].trim().toLowerCase()) {
                case 'codeunit':
                case 'page':
                case 'pagecustomization':
                case 'pageextension':
                case 'report':
                case 'table':
                case 'tableextension':
                case 'xmlport':
                    {
                        var patternObject = new RegExp(`(${objectTypeArr[0].trim().toLowerCase()}) +([0-9]+) +(${objectNamePattern}|${objectNameNoQuotesPattern})([^"\n]*"[^"\n]*)?`, "i");
                        let currObject = objectDeclarationLine.match(patternObject);
                        if (currObject === null) {
                            return;
                        }

                        this.alObject.objectType = currObject[1];
                        this.alObject.objectID = currObject[2];
                        this.alObject.objectName = currObject[3];

                        break;
                    }
                default: {
                    return;
                }
            }
            this.alObject.objectType = StringFunctions.titleCaseWord(this.alObject.objectType.trim().toString());
            if (this.alObject.objectType === 'Table') {
                this.alObject.objectType = 'Record';
            }
            this.alObject.objectID = this.alObject.objectID.trim().toString();
            this.alObject.objectNo = +this.alObject.objectID;
            this.alObject.objectName = this.alObject.objectName.trim().toString().replace(/"/g, '');
            this.alObject.longVarName = this.alObject.objectName.replace(/[^a-zA-Z]/g, "");
        }

        if (!objectTypeArr) {
            return;
        }

        if (procedureArr) {
            for (let i = 0; i < procedureArr.length; i++) {
                let lastSpaceIndex: number = procedureArr[i].lastIndexOf(" ");
                let procedureName: string = procedureArr[i].substring(lastSpaceIndex + 1);
                if (procedureName) {
                    this.procedures.push(procedureName);
                }
            }
        }
    }
}