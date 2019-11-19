import * as vscode from 'vscode';

export class ALVariable {
    public longVarName: string = "";
    public shortVarName: string = "";
    public objectType: string = "";
    public objectName: string ="";
    
    constructor(longVarName: string, shortVarName: string, objectType: string, objectName: string) {
        this.longVarName = longVarName;
        this.shortVarName = shortVarName;
        this.objectType = objectType;
        this.objectName = objectName;
    }
 }