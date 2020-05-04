import * as vscode from 'vscode';
import { ALFile} from './alFile';
import { StringFunctions } from '../stringFunctions';
import { ALObject } from './alObject';
import { ALObjectStorage } from './alObjectStorage';
import { close } from 'fs';
     
  export class ALFiles {
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

    public getObjectTypeAndNameFromVarName(varName: string) : string {
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
}