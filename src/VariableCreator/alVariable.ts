import * as vscode from 'vscode';

export class ALVariable {
    public objectID: number = 0;
    public longVarName: string = "";
    public shortVarName: string = "";
    public objectType: string = "";
    public objectName: string ="";
    
    constructor(objectID: number, longVarName: string, shortVarName: string, objectType: string, objectName: string) {
        this.objectID = objectID;
        this.longVarName = longVarName;
        this.shortVarName = shortVarName;
        this.objectType = objectType;
        this.objectName = objectName;
    }
 }