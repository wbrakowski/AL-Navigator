import * as vscode from 'vscode';
import { ALFile} from './alFile';
import { ALObject } from './alObject';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { UpdateTypes } from '../additional/updateTypes';
import { ALVariable } from './alVariable';
import { ALCodeOutlineExtension } from '../additional/devToolsExtensionContext';
import { ObjectTypes } from '../additional/objectTypes';
import { ALVarHelper } from './alVarHelper';
import { ALVarTypes } from '../additional/alVarTypes';
import { StringFunctions } from '../additional/stringFunctions';
     
  export class ALFiles {
    populatedFromCache: boolean = false;
    private _document: vscode.TextDocument | undefined;
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
        await this.fillObjects();
        let varNameSearchString = varName;
        let alVariable = new ALVariable(varName);
        
        // Check if string starts with temp
        let indexTemp = varName.toUpperCase().indexOf('TEMP');
        if (indexTemp === 0) {
            varNameSearchString = varName.substr(4);
            alVariable.isTemporary = true;
        }
        // Check if string has a trailing number
        let lastChar = varNameSearchString.charAt(varNameSearchString.length - 1);
        if (!isNaN(+lastChar)) {
            varNameSearchString = varNameSearchString.substr(0, varNameSearchString.length - 1);
        }
       
        let alObject = this.alObjects.find(i => varNameSearchString.toUpperCase() === i.longVarName.toUpperCase());
        if (!alObject) {
            alObject = this.alObjects.find(f => varNameSearchString.toUpperCase() === f.shortVarName.toUpperCase());
        }
        // TODO Split words in title case and check if name can then be found
        if (alObject) {
            alVariable.name = varName;
            if (alObject.objectType.toLowerCase() === ObjectTypes.page) {
                let pageTypes: string[] = ["Page", "TestPage"];
                let selectedType = await vscode.window.showQuickPick(pageTypes, {
                    canPickMany: false,
                    placeHolder: 'Select page type'
                });
                switch (selectedType) {
                    case ("Page"): 
                        alVariable.objectType = "Page";
                        break;
                    case ("TestPage"):
                        alVariable.objectType = "TestPage";
                        break;
                    default:
                        return;
                }
            }
            else {
                alVariable.objectType = alObject.objectType;
            }
            alVariable.objectName = alObject.objectName;
        }
        else {
            // Could not find variable long or short name in the al objects list, let's get creative and see if it matches a var type pattern!
            ALVarHelper.varNameMatchesPattern(alVariable, varNameSearchString);
        }

        return alVariable;
    }

    public async update(uri: vscode.Uri, updateType: UpdateTypes) {
        if (!this.alObjects) {
            return;
        }
        switch (updateType) {
            case UpdateTypes.delete:
            case UpdateTypes.modify: {
                if (uri.fsPath !== "") {
                    let deleteIndex = this.alObjects.findIndex(i => i.fsPath === uri.fsPath);
                    if (deleteIndex > 0) {
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
            return;
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

    public async fillObjects() {
        if (this.populatedFromCache) {
            return;
        }

        let tables: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.table);
        let pages: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.page);
        let cus: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.codeunit);
        let reports: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.report);
        let enums: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.enum);
        let queries: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.query);
        let xmlports: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.xmlport);
        let controllAddIns: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.controlAddIn);
        let interfaces: string[] = await ALCodeOutlineExtension.getObjectList(ObjectTypes.interface);

        if (!tables && !pages && !cus && !reports && !enums && !queries && !xmlports && !controllAddIns && !interfaces) {
            return;
        }

        await this.pushToObjects(tables, ObjectTypes.table);
        await this.pushToObjects(pages, ObjectTypes.page);
        await this.pushToObjects(cus, ObjectTypes.codeunit);
        await this.pushToObjects(reports, ObjectTypes.report);
        await this.pushToObjects(enums, ObjectTypes.enum);
        await this.pushToObjects(queries, ObjectTypes.query);
        await this.pushToObjects(xmlports, ObjectTypes.xmlport);
        await this.pushToObjects(controllAddIns, ObjectTypes.controlAddIn);
        await this.pushToObjects(interfaces, ObjectTypes.interface);

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

    private async pushToObjects(newObjects: string[], objectType: ObjectTypes) {
        for (let i = 0; i < newObjects.length; i++) {
            let alObject = new ALObject();
            alObject.objectName = newObjects[i];
            alObject.objectType = objectType === ObjectTypes.table ? 'Record' : StringFunctions.titleCaseWord(objectType);
            alObject.longVarName = ALVarHelper.getLongVarName(alObject.objectName);
            alObject.shortVarName = ALVarHelper.getShortVarName(alObject.objectName);
            this.alObjects.push(alObject);
        }
    }

}