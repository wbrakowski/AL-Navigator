import * as vscode from 'vscode';
import { ALFile } from './alFile';
import { ALObject } from './alObject';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { UpdateTypes } from '../additional/updateTypes';
import { ALVariable } from './alVariable';
import { ALCodeOutlineExtension } from '../additional/devToolsExtensionContext';
import { ObjectTypes } from './objectTypes';
import { ALVarHelper } from './alVarHelper';
import { ALDataTypes } from './alDataTypes';
import { StringFunctions } from '../additional/stringFunctions';

export class ALFiles {
    populatedFromCache: boolean = false;
    appFilesChanged: boolean = false;
    private _document: vscode.TextDocument | undefined;
    set document(doc: vscode.TextDocument | undefined) {
        this._document = doc;
    }
    get document(): vscode.TextDocument | undefined {
        return this._document;
    }
    public workspaceALFiles: ALFile[] = new Array();
    public alObjects: ALObject[] = new Array();

    constructor() {
        this.populateALFilesArray();    
        this.fillObjects();
        let watcherALFiles = vscode.workspace.createFileSystemWatcher('**/*.al');
        watcherALFiles.onDidCreate(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.updateALFiles(e, UpdateTypes.insert);
            }
        });

        watcherALFiles.onDidChange(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.updateALFiles(e, UpdateTypes.modify);
            }
        });

        watcherALFiles.onDidDelete(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.vscode') === -1) {
                await this.updateALFiles(e, UpdateTypes.delete);
            }
        });

        let watcherAppFiles = vscode.workspace.createFileSystemWatcher('**/*.app');
        watcherAppFiles.onDidCreate(async (e: vscode.Uri) => {
            if (e.fsPath.indexOf('.alpackages') !== -1) {
                await this.updateAppFiles(e, UpdateTypes.insert);
            }
        });

        // watcherAppFiles.onDidChange(async (e: vscode.Uri) => {
        //     if (e.fsPath.indexOf('.alpackages') !== -1) {
        //         await this.updateAppFiles(e, UpdateTypes.modify);
        //     }
        // });

        // watcherAppFiles.onDidDelete(async (e: vscode.Uri) => {
        //     if (e.fsPath.indexOf('.alpackages') !== -1) {
        //         await this.updateAppFiles(e, UpdateTypes.delete);
        //     }
        // });
    }

    private getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
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

    private getAlFilesFromCurrentWorkspace(searchPattern: string) {
        let activeTextEditorDocumentUri = this.getCurrentWorkspaceFolder();

        if (activeTextEditorDocumentUri) {
            return vscode.workspace.findFiles(new vscode.RelativePattern(activeTextEditorDocumentUri, searchPattern));
        } else {
            return vscode.workspace.findFiles(searchPattern);
        }
    }

    private populateALFilesArray(): void {
        let workspaceALFiles: ALFile[] = new Array();
        let searchPattern: string = '**/*.al*';
        this.getAlFilesFromCurrentWorkspace(searchPattern).then(Files => {
            try {
                Files.forEach(file => {
                    let workspaceALFile: ALFile = new ALFile(file);
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

    public async getALVariableByName(varName: string, ignorePrefix: string, ignoreSuffix: string): Promise<ALVariable | undefined> {
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
                        alVariable.setDataType("Page", 1, alObject.objectName);
                        break;
                    case ("TestPage"):
                        alVariable.setDataType("TestPage", 1, alObject.objectName);
                        break;
                    default:
                        return;
                }
            }
            else {
                alVariable.setDataType(alObject.objectType, 1, alObject.objectName);
            }
        }
        else {
            // Could not find variable long or short name in the al objects list, let's get creative and see if it matches a var type pattern!
            ALVarHelper.varNameMatchesPattern(alVariable, varNameSearchString);
        }

        return alVariable;
    }

    public async updateALFiles(uri: vscode.Uri, updateType: UpdateTypes) {
        if (!this.alObjects) {
            return;
        }
        switch (updateType) {
            case UpdateTypes.insert: {
                let workspaceALFile: ALFile = new ALFile(uri);
                if (!this.workspaceALFiles.find(i => workspaceALFile.alObject.objectType === i.alObject.objectType && workspaceALFile.alObject.objectName === i.alObject.objectName)) {
                    this.workspaceALFiles.push(workspaceALFile);
                    this.alObjects.push(workspaceALFile.alObject);
                }
            }
            case UpdateTypes.delete,
                UpdateTypes.modify: {
                    if (uri.fsPath !== "") {
                        let workspaceALFile: ALFile = new ALFile(uri);
                        let deleteIndex = await this.getDeleteIdxInWorkspacefiles(workspaceALFile);
                        if (deleteIndex === -1) {
                            return;
                        }
                        let deleteIndex2 = await this.getDeleteIdxInALObjects(deleteIndex);
                        if (deleteIndex2 > -1) {
                            this.alObjects.splice(deleteIndex2, 1);
                        }
                        this.workspaceALFiles.splice(deleteIndex, 1);

                        if (updateType !== UpdateTypes.modify) {
                            return;
                        }

                        if (!this.workspaceALFiles.find(i => workspaceALFile.alObject.objectType === i.alObject.objectType && workspaceALFile.alObject.objectName === i.alObject.objectName)) {
                            this.workspaceALFiles.push(workspaceALFile);
                            this.alObjects.push(workspaceALFile.alObject);
                        }
                    }
                }
        }
    }

    private async getDeleteIdxInWorkspacefiles(workspaceALFile: ALFile): Promise<number> {
        let deleteIdx = -1;
        if (workspaceALFile.alObject.objectID !== "" || workspaceALFile.alObject.objectType !== "") {
            deleteIdx = this.workspaceALFiles.findIndex(i => workspaceALFile.alObject.objectType === i.alObject.objectType && workspaceALFile.alObject.objectID === i.alObject.objectID);
            if (deleteIdx === -1) {
                if (workspaceALFile.alObject.objectName !== "") {
                    deleteIdx = this.workspaceALFiles.findIndex(i => workspaceALFile.alObject.objectType === i.alObject.objectType && workspaceALFile.alObject.objectName === i.alObject.objectName);
                    if (deleteIdx === -1) {
                        deleteIdx = this.workspaceALFiles.findIndex(i => workspaceALFile.alObject.objectName === i.alObject.objectName && workspaceALFile.alObject.objectID === i.alObject.objectID);
                    }
                }
            }
        }
        return deleteIdx;
    }

    private async getDeleteIdxInALObjects(workspaceFilesIdx: number): Promise<number> {
        return this.alObjects.findIndex(i => this.workspaceALFiles[workspaceFilesIdx].alObject.objectType === i.objectType && this.workspaceALFiles[workspaceFilesIdx].alObject.objectID === i.objectID);
    }


    public async updateAppFiles(uri: vscode.Uri, updateType: UpdateTypes) {
        if (!this.alObjects) {
            return;
        }
        switch (updateType) {
            case UpdateTypes.insert: {
                this.appFilesChanged = true;
                await this.delay(2000);
                await this.fillObjects();
                this.appFilesChanged = false;
            }
        }
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
        if (this.populatedFromCache && !this.appFilesChanged) {
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
        for (let i = 0; i < filteredObjects.length; i++) {
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
            // TODO This should not be necessary but let's avoid that there are multiple entries for the same object
            if (!this.alObjects.find(i => alObject.objectType === i.objectType && alObject.objectName === i.objectName)) {
                this.alObjects.push(alObject);
            }
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}