import * as vscode from 'vscode';
import { ALFile} from './alFile';
import { StringFunctions } from '../additional/stringFunctions';
import { ALObject } from './alObject';
import { ALObjectStorage } from './alObjectStorage';
import { close } from 'fs';
import { ALCodeOutlineExtension } from '../additional/devToolsExtensionContext';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { isUndefined, isNull } from 'util';
     
  export class ALFiles {

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
        this.alObjects = ALObjectStorage.getALStdObjects();
        this.populateALFilesArray();

        // TODO Check performance

        // let watcher = vscode.workspace.createFileSystemWatcher('**/*.al');
        // watcher.onDidCreate(async (e: vscode.Uri) => {
        //     if (e.fsPath.indexOf('.vscode') === -1) {
        //         await this.update();
        //     }
        // });

        // watcher.onDidChange(async (e: vscode.Uri) => {
        //     if (e.fsPath.indexOf('.vscode') === -1) {
        //         await this.update();
        //     }
        // });

        // watcher.onDidDelete(async (e: vscode.Uri) => {
        //     if (e.fsPath.indexOf('.vscode') === -1) {
        //         await this.update();
        //     }
        // });
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
                    workspaceALFiles.push(workspaceALFile);
                    this.alObjects.push(workspaceALFile.alObject);
                    console.log(workspaceALFile.alObject);
                });
                } 
            catch (error) {
                vscode.window.showErrorMessage(error.message);
            }

        });    
        this.workspaceALFiles = workspaceALFiles;
    }

 

    public variableNameExists(varName : string) : boolean {
        let alVariable = this.alObjects.find(i => varName.toUpperCase() === (i.longVarName.toUpperCase()));
        // TODO: Check this one day: Cloest match?
        if (!alVariable) {
            alVariable = this.alObjects.find(i => varName.toUpperCase().includes(i.longVarName.toUpperCase()));
        }
        if (alVariable) {
            return true;
        }
        else {
            return false;
        }
    }

    public async getObjectTypeAndNameFromVarName(varName: string) : Promise<string | undefined>{
        // Search std objects
        let alVariable = this.alObjects.find(i => varName.toUpperCase() === i.longVarName.toUpperCase());
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
        if (alVariable) {
            let objName = alVariable.objectName;
            if (StringFunctions.containsSpecialChars(objName)) {
                objName = "\"" + objName + "\"";
            }
            return alVariable.objectType + " " + objName;
        }
        else {
            return "";
        }
    }

    public async update() {
        this.populateALFilesArray();
    }

    public getRelevantDiagnosticOfCurrentPosition(range: vscode.Range) {
        if (isUndefined(this.document)) {
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
        if (isUndefined(d.source)) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }
    private checkDiagnosticsCode(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.code)) {
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
}