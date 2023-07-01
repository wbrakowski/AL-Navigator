import * as vscode from 'vscode';
import { ALFile } from './alFile';
import { ALObject } from './alObject';
import { DiagnosticCodes } from '../diagnostic/diagnosticCodes';
import { UpdateTypes } from '../additional/updateTypes';
import { ALVariable } from './alVariable';
import { ALCodeOutlineExtension } from '../al_code_outline/devToolsExtensionContext';
import { ObjectTypes } from './objectTypes';
import { ALVarHelper } from './alVarHelper';
import { ALDataTypes } from './alDataTypes';
import { StringFunctions } from '../additional/stringFunctions';
import { DiagnosticAnalyzer } from "../diagnostic/diagnosticAnalyzer";
import * as semver from 'semver';
import { getActiveWorkspacePath as getActiveFolder } from '../files/folderHelper';


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
    private lastActiveFolder: string = "";

    constructor() {
        this.populateALFilesArray();
        // this.fillObjects();
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

        let alObjects = this.alObjects.filter(i => varNameSearchString.toUpperCase() === i.longVarName.toUpperCase());
        if (!alObjects) {
            alObjects = this.alObjects.filter(f => varNameSearchString.toUpperCase() === f.shortVarName.toUpperCase());
        }
        // TODO Split words in title case and check if name can then be found
        if (alObjects.length > 0) {
            alVariable.name = varName;
            let objTypes: string[] = [];
            if (hasObjectType(alObjects, ObjectTypes.table)) {
                objTypes.push("Table");
            }
            if (hasObjectType(alObjects, ObjectTypes.page)) {
                objTypes.push("Page");
                objTypes.push("TestPage");
            }
            if (hasObjectType(alObjects, ObjectTypes.codeunit)) {
                objTypes.push("Codeunit");
            }
            if (hasObjectType(alObjects, ObjectTypes.report)) {
                objTypes.push("Report");
            }

            if (objTypes.length === 1) {
                alVariable.setDataType(alObjects[0].objectType, 1, alObjects[0].objectName);
            }
            else {
                let selectedType = await vscode.window.showQuickPick(objTypes, {
                    canPickMany: false,
                    placeHolder: 'Select object type'
                });
                switch (selectedType) {
                    case ("Table"):
                        alVariable.setDataType("Record", 1, alObjects[0].objectName);
                        break;
                    case ("Page"):
                        alVariable.setDataType("Page", 1, alObjects[0].objectName);
                        break;
                    case ("TestPage"):
                        alVariable.setDataType("TestPage", 1, alObjects[0].objectName);
                        break;
                    case ("Codeunit"):
                        alVariable.setDataType("Codeunit", 1, alObjects[0].objectName);
                        break;
                    case ("Report"):
                        alVariable.setDataType("Report", 1, alObjects[0].objectName);
                        break;
                    default:
                        return;
                }
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
            case UpdateTypes.delete || UpdateTypes.modify: {
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



    public async fillObjects() {
        let activeFolder = getActiveFolder();
        if (this.populatedFromCache && !this.appFilesChanged && this.lastActiveFolder === activeFolder) {
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

        if (
            tables.length === 0 &&
            pages.length === 0 &&
            cus.length === 0 &&
            reports.length === 0 &&
            enums.length === 0 &&
            queries.length === 0 &&
            xmlports.length === 0 &&
            controllAddIns.length === 0 &&
            interfaces.length === 0) {
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
        if (this.lastActiveFolder !== activeFolder) {
            this.lastActiveFolder = activeFolder;
        }
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

    public async getReportList(): Promise<string[]> {
        let objects: string[] = [];
        objects = await ALCodeOutlineExtension.getReportList();
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

function hasObjectType(alObjects: ALObject[], objectType: ObjectTypes): boolean {
    if (objectType === ObjectTypes.table) {
        if (alObjects.find(i => i.objectType.toLowerCase() === "record")) {
            return true;
        }
    }
    else if (alObjects.find(i => i.objectType.toLowerCase() === objectType)) {
        return true;
    }
    else {
        return false;
    }
}


