import * as vscode from 'vscode';
import { ALFile} from './alFile';
import { ALObject } from './alObject';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { UpdateTypes } from '../additional/updateTypes';
import { ALVariable } from './alVariable';
import { ALCodeOutlineExtension } from '../additional/devToolsExtensionContext';
import { ObjectTypes } from '../additional/objectTypes';
import { ALVarHelper } from './alVarHelper';
import { createCipher } from 'crypto';
     
  export class ALFiles {

    private _document: vscode.TextDocument | undefined;
    populatedFromCache: boolean = false;
    set document(doc: vscode.TextDocument | undefined) {
        this._document = doc;
    }
    get document() : vscode.TextDocument | undefined {
        return this._document;
    }
    public workspaceALFiles: ALFile[] = new Array(); 
    public alObjects: ALObject[] = new Array();

    constructor() {
        this.populateALFilesArray();
        // this.fillObjects();
        let watcher = vscode.workspace.createFileSystemWatcher('**/*.al');
        watcher.onDidCreate(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.update(e, UpdateTypes.insert);
            }
        });

        watcher.onDidChange(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.update(e, UpdateTypes.modify);
            }
        });

        watcher.onDidDelete(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.update(e, UpdateTypes.delete);
            }
        });
    }

    private getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined{
        if (vscode.workspace.workspaceFolders) {
            let workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.workspace.workspaceFolders[0].uri);

            let activeTextEditorDocumentUri = null;
            try {
                if (vscode.window.activeTextEditor) {
                    activeTextEditorDocumentUri = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
                }
            } catch (error) {
                activeTextEditorDocumentUri = null;
            }
    
            if (activeTextEditorDocumentUri) { 
                workspaceFolder = activeTextEditorDocumentUri;
            }
    
            return workspaceFolder;
        }
    }
       
    private getAlFilesFromCurrentWorkspace(searchPattern : string) {
        let activeTextEditorDocumentUri = this.getCurrentWorkspaceFolder();

        if (activeTextEditorDocumentUri) {
            return vscode.workspace.findFiles(new vscode.RelativePattern(activeTextEditorDocumentUri, searchPattern));
        } else {
            return vscode.workspace.findFiles(searchPattern);
        }
    }

    private populateALFilesArray() : void {
        let workspaceALFiles : ALFile[] = new Array();    
        let searchPattern : string = '**/*.al*';
        this.getAlFilesFromCurrentWorkspace(searchPattern).then(Files => {
            try {
                Files.forEach(file => {
                    let workspaceALFile : ALFile = new ALFile(file);
                    workspaceALFile.alObject.workspaceFile = true;
                    workspaceALFile.alObject.fsPath = file.fsPath;
                    workspaceALFiles.push(workspaceALFile);
                    this.alObjects.push(workspaceALFile.alObject);
                    // console.log(workspaceALFile.alObject);
                });
                } 
            catch (error) {
                vscode.window.showErrorMessage(error.message);
            }

        });    
        this.workspaceALFiles = workspaceALFiles;
    }

    public async getALVariableByName(varName: string) : Promise<ALVariable | undefined>{
        this.fillObjects();
        let useShortVarName: boolean = false;

        let alVariable = new ALVariable(varName);
        let indexTemp = varName.toUpperCase().indexOf('TEMP');
        if (indexTemp === 0) {
            varName = varName.substr(4);
            alVariable.isTemporary = true;
        }
        let alObject = this.alObjects.find(i => varName.toUpperCase() === i.longVarName.toUpperCase());
        if (!alObject) {
            alObject = this.alObjects.find(f => varName.toUpperCase() === f.shortVarName.toUpperCase());
            if (alObject) {
                useShortVarName = true;
            }
        }
        // TODO: Check this one day ;-)
        // Cannot find 100% match, try to find cloest match
        // if (!alVariable) {
        //     let results = this.alObjects.filter(i => varName.toUpperCase().includes(i.longVarName.toUpperCase()));
        //     let closestDistance = 0;
        //     for (let i = 0;i < results.length;i++) {
        //         let distance = StringFunctions.LevenshteinDistance(varName.toUpperCase(), results[i].longVarName.toUpperCase());
        //         if (closestDistance === 0) {
        //             closestDistance = distance;
        //             console.log(closestDistance);

        //             alVariable = results[i];
        //         }
        //         else 
        //             if (distance < closestDistance) {
        //                 closestDistance = distance;
        //                 console.log(closestDistance);
        //                 alVariable = results[i];
        //         }
        //     }
        // }
        if (alObject) {
            alVariable.name = useShortVarName ? alObject.shortVarName : alObject.longVarName;
            alVariable.objectType = alObject.objectType;
            alVariable.objectName = alObject.objectName;
        }

        return alVariable;
    }

    public async update(uri: vscode.Uri, updateType: UpdateTypes) {
        switch (updateType) {
            case UpdateTypes.delete:
            case UpdateTypes.modify: {
                if (uri.fsPath !== "") {
                    // let deleteIndex: number = this.workspaceALFiles.findIndex(i => i.uri.fsPath === uri.fsPath);
                    let deleteIndex: number = this.alObjects.findIndex(i => i.fsPath === uri.fsPath);
                    if (deleteIndex > 0) {
                        // TODO
                        // Remove object from workspace al Files
                        this.alObjects.splice(deleteIndex, 1);
                    }

                }
            }
        }
        let workspaceALFile : ALFile = new ALFile(uri);
        this.workspaceALFiles.push(workspaceALFile);
        this.alObjects.push(workspaceALFile.alObject);
    }

    public getRelevantDiagnosticOfCurrentPosition(range: vscode.Range) {
        if (!this.document) {
            return undefined;
        }
        let diagnostics = vscode.languages.getDiagnostics(this.document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });


        return diagnostics.length === 1 ? diagnostics[0] : undefined;
    }

    private checkDiagnosticsLanguage(d: vscode.Diagnostic): boolean {
        if (!d.source) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }
    private checkDiagnosticsCode(d: vscode.Diagnostic): boolean {
        if (!d.code) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in DiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(d.code.toString());
    }

    private checkDiagnosticsPosition(d: vscode.Diagnostic, range: vscode.Range): boolean {
        return d.range.contains(range);
    }

    private async fillObjects() {
        if (this.populatedFromCache) {
            return;
        }
        // TODO find better way?

        let tables: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.table);
        let pages: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.page);
        let cus: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.codeunit);
        let reports: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.report);
        let enums: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.enum);
        let queries: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.query);
        let xmlports: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.xmlport);
        let controllAddIns: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.controlAddIn);
        let interfaces: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.interface);

        if (!tables && !pages && !cus && !reports && !enums && !queries && !xmlports && !controllAddIns) {
            return;
        }

        for (let i=0; i<tables.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = tables[i];
            alObject.objectType = "Record";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<pages.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = pages[i];
            alObject.objectType = "Page";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<cus.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = cus[i];
            alObject.objectType = "Codeunit";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<reports.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = reports[i];
            alObject.objectType = "Report";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<enums.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = enums[i];
            alObject.objectType = "Enum";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<queries.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = queries[i];
            alObject.objectType = "Query";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<xmlports.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = xmlports[i];
            alObject.objectType = "XmlPort";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<controllAddIns.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = controllAddIns[i];
            alObject.objectType = "ControlAddIn";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        for (let i=0; i<interfaces.length-1; i++) {
            let alObject = new ALObject();
            alObject.objectName = interfaces[i];
            alObject.objectType = "Interface";
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }

        this.populatedFromCache = true;
    }

    public getObjectList(objectType: ObjectTypes): string[] {
        let objects: string[] = [];
        let checkString = objectType === ObjectTypes.table ? "RECORD" : objectType.toUpperCase();
        let filteredObjects = this.alObjects.filter(obj => obj.objectType.toUpperCase() === checkString);
        for(let i = 0; i < filteredObjects.length-1; i++) {
            objects.push(filteredObjects[i].objectName);
        }
        return objects;
    }
}