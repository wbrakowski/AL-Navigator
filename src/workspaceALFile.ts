import * as vscode from 'vscode';
import * as fs from 'fs';
import { ALFileOperations } from './alFileOperations';

export class WorkSpaceALFile {
    public uri: vscode.Uri;
    public filePath: string;
    public fileName: string;
    public fileText: string;
    public objectType: string = "";
    public objectName: string= "";
    public objectID: string = "";
    public procedures: string[] = new Array();
    
    constructor(file : vscode.Uri) {
        this.uri = file;
        this.filePath = file.fsPath;
        this.fileName = this.getFileNameFromPath(this.filePath);
        this.fileText = this.getTextFromFile();
        this.getObjectInfoFromText();
        // console.log(this.fileName);
        // console.log(this.objectType);
        // console.log(this.objectName);
        // console.log(this.objectID);
        // console.log(this.procedures.toString());
    }

    private getFileNameFromPath(path : string) : string {
        return path.replace(/^.*[\\\/]/, '');
    }

    private getTextFromFile(): string {
        return fs.readFileSync(this.uri.fsPath).toString();
    }

    public checkIfProcedureExistsInFile(procedureName : string): boolean {
        return (this.procedures.indexOf(procedureName) > -1);
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

                    this.objectType = currObject[1];
                    this.objectID = currObject[2];
                    this.objectName = currObject[3];

                    break;
                }
                default: {
                    return;
                }
            }
            this.objectType = this.objectType.trim().toString();
            this.objectID = this.objectID.trim().toString();
            this.objectName = this.objectName.trim().toString().replace(/"/g, '');
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