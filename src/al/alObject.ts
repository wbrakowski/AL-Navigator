import * as vscode from 'vscode';

export class ALObject {
    public objectType: string = "";
    public objectID: string = "";
    public objectNo: number = 0;
    public longVarName: string = "";
    public shortVarName: string = "";
    public objectName: string ="";
    public workspaceFile: boolean = false;
    public fsPath: string = "";
    
    constructor() {
    }

    public setValues(objectType: string, objectNo: number, longName: string, shortName: string, objectName: string) {
        this.objectType = objectType;
        this.objectNo = objectNo;
        this.objectID = objectNo.toString();
        this.longVarName = longName;
        this.shortVarName = shortName;
        this.objectName = objectName;
    }
 }