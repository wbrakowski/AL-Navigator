import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { ALFile} from './alFile';
import { ALFileCrawler } from './alFileCrawler';
import { StringFunctions } from '../stringFunctions';
import { ALObject } from './alObject';
import { ALObjectStorage } from './alObjectStorage';
     
  export class ALFiles {
    public workspaceALFiles: ALFile[] = new Array(); 
    public alStdObjects: ALObject[] = new Array();

    constructor() {
        this.populateALFilesArray();
        this.alStdObjects = ALObjectStorage.getALStdObjects();
    }

    public localProcCanBeCreated(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trim();
        if (ALFileCrawler.isComment(currLineText)) {
            return false;
        }
        if (ALFileCrawler.isLocalProcedureCall(currLineText)) {
            if (!ALFileCrawler.localProcedureAlreadyExists(currLineText)) {
                return true;
            }
        }
        
        return false;
    }


    public geCurrLineRemoteALFile(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): ALFile | undefined {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trimLeft();
        if (ALFileCrawler.isComment(currLineText)) {
            return undefined;
        }
        
        if (ALFileCrawler.isGlobalProcedureCall(currLineText)) {
            let varName = ALFileCrawler.extractVarNameFromProcCall(currLineText).trim();
            let varType = ALFileCrawler.findParamType(varName).trimLeft();
            let indexSpace = varType.indexOf(" ");
            let objectName = varType.substr(indexSpace + 1);
            objectName = StringFunctions.removeDoubleQuotesFromString(objectName);
            let remoteALFile = this.workspaceALFiles.find(i => i.alObject.objectName === objectName);
            return remoteALFile;
            
        }
        return undefined;
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
                });
                } 
            catch (error) {
                vscode.window.showErrorMessage(error.message);
            }

        });    
        this.workspaceALFiles = workspaceALFiles;
    }

 

    public variableNameExists(varName : string) : boolean {
        let alVariable = this.alStdObjects.find(i => varName.toUpperCase() === (i.longVarName.toUpperCase()));
        if (!alVariable) {
            alVariable = this.alStdObjects.find(i => varName.toUpperCase().includes(i.longVarName.toUpperCase()));
        }
        if (alVariable) {
            return true;
        }
        else {
            return false;
        }
    }

    public getObjectTypeAndNameFromVarName(varName: string) : string {
        let alVariable = this.alStdObjects.find(i => varName.toUpperCase() === i.longVarName.toUpperCase());
        if (!alVariable) {
            alVariable = this.alStdObjects.find(i => varName.toUpperCase().includes(i.longVarName.toUpperCase()));
        }
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
}