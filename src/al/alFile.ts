import * as vscode from 'vscode';
import * as fs from 'fs';
import { ALObject } from './alObject';

export class ALFile {
    public uri: vscode.Uri;
    public filePath: string;
    public fileName: string;
    public fileText: string;
    public alObject: ALObject = new ALObject();
    public procedures: string[] = new Array();
    
    constructor(file : vscode.Uri) {
        this.uri = file;
        this.filePath = file.fsPath;
        this.fileName = this.getFileNameFromPath(this.filePath);
        this.fileText = this.getTextFromFile();
        this.getObjectInfoFromText();
    }

    private getFileNameFromPath(path : string) : string {
        return path.replace(/^.*[\\\/]/, '');
    }

    private getTextFromFile(): string {
        return fs.readFileSync(this.uri.fsPath).toString();
    }

    public procedureExistsInFile(procedureName : string): boolean {
        return (this.procedures.includes(procedureName));
    }

    private getObjectInfoFromText() {
        let firstLineFileText = this.fileText.split('\n', 1)[0];
        var patternObjectType = new RegExp('(codeunit |page |pagecustomization |pageextension |report |table |tableextension |xmlport)', "i");
        let procedureNamePattern = '[\\w]*';
        var objectNamePattern = '"[^"]*"'; // All characters except "
        var objectNameNoQuotesPattern = '[\\w]*';
        var patternProcedure = new RegExp(`(procedure) +(${procedureNamePattern})`, "gi");
        let objectTypeArr = firstLineFileText.match(patternObjectType);
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
                    let currObject = firstLineFileText.match(patternObject);
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
            this.alObject.objectType = this.alObject.objectType.trim().toString();
            this.alObject.objectID = this.alObject.objectID.trim().toString();
            this.alObject.objectNo = +this.alObject.objectID;
            this.alObject.objectName = this.alObject.objectName.trim().toString().replace(/"/g, '');
        }

        if (!objectTypeArr) {
            return;
       }

       if (procedureArr) {
            for(let i = 0; i < procedureArr.length; i++) {
                let lastSpaceIndex : number = procedureArr[i].lastIndexOf(" ");
                let procedureName : string = procedureArr[i].substring(lastSpaceIndex + 1);
                if (procedureName) {
                    this.procedures.push(procedureName);
                }
            }
        }
    }
 }