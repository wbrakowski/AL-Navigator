import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { WorkSpaceALFile} from './workspaceALFile';
import { ALFileCrawler } from './alFileCrawler';
import { StringFunctions } from './stringFunctions';
     
  export class ALFiles {
    public workspaceALFiles : WorkSpaceALFile[]; 
    public currentSelectionProcedureName : string = "";
    public currentRemoteALFile: WorkSpaceALFile | undefined;

    constructor() {
        this.workspaceALFiles = this.populateALFilesArray();
    }

    public repopulateALFIlesArray() {
        this.workspaceALFiles = this.populateALFilesArray();
    }
    
    private ClearCurrentSelectionValues() : void {
        this.currentRemoteALFile = undefined;
        this.currentSelectionProcedureName = "";
    }
    public localProcCanBeCreated(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        this.ClearCurrentSelectionValues();
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

    public RemoteProcCanBeCreated(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        this.ClearCurrentSelectionValues();
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trimLeft();
        if (ALFileCrawler.isComment(currLineText)) {
            return false;
        }
        
        if (ALFileCrawler.isGlobalProcedureCall(currLineText)) {
            let procedureName : string = ALFileCrawler.extractProcedureName(currLineText);
            let procedureOwnerVariableName = ALFileCrawler.extractProcedureOwnerVariableNameFromText(currLineText).trim();
            let procedureOwnerVariableType = ALFileCrawler.findParamType(procedureOwnerVariableName).trimLeft();
            let indexSpace = procedureOwnerVariableType.indexOf(" ");
            let objectType = procedureOwnerVariableType.substr(0, indexSpace);
            let objectName = procedureOwnerVariableType.substr(indexSpace + 1);
            objectName = StringFunctions.removeDoubleQuotesFromString(objectName);
            let remoteALFile = this.workspaceALFiles.find(i => i.objectName === objectName);
            if (remoteALFile) {
                if (!remoteALFile.procedures.includes(procedureName)) {
                    this.currentSelectionProcedureName = procedureName;
                    this.currentRemoteALFile = remoteALFile;
                    return true;
                }
            }
        }
        
        return false;
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
       
    private getCurrentWorkspaceFolderFromUri(filePath: vscode.Uri): vscode.WorkspaceFolder | undefined {
        let workspaceFolder = vscode.workspace.getWorkspaceFolder(filePath);

        return workspaceFolder;
    }
    private getAlFilesFromCurrentWorkspace(searchPattern : string) {
        let activeTextEditorDocumentUri = this.getCurrentWorkspaceFolder();

        if (activeTextEditorDocumentUri) {
            return vscode.workspace.findFiles(new vscode.RelativePattern(activeTextEditorDocumentUri, searchPattern));
        } else {
            return vscode.workspace.findFiles(searchPattern);
        }
    }

    private populateALFilesArray() : WorkSpaceALFile[] {
        let workspaceALFiles : WorkSpaceALFile[] = new Array();    
        let searchPattern : string = '**/*.al*';
        this.getAlFilesFromCurrentWorkspace(searchPattern).then(Files => {
            try {
                Files.forEach(file => {
                    let workspaceALFile : WorkSpaceALFile = new WorkSpaceALFile(file);
                    workspaceALFiles.push(workspaceALFile);
                });
                } 
            catch (error) {
                vscode.window.showErrorMessage(error.message);
            }

        });    
        return workspaceALFiles;
    }

    getVarNameToDeclare(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): string {
        let currLineText = ALFileCrawler.getLineText(document, range);
        let currLineDetectedVars = ALFileCrawler.extractVars(currLineText);
        let localVarsAndParams = ALFileCrawler.extractLocalVarsAndParams();

        function containsAllElements(arr: string[], arr2: string[]): boolean {
            return arr.every(i => arr2.includes(i));
        }

        let allVarsDeclared: boolean = containsAllElements(currLineDetectedVars, localVarsAndParams);
        if (!allVarsDeclared) {
            for(let i = 0; i< currLineDetectedVars.length; i++) {
                let detVarIndex = localVarsAndParams.indexOf(currLineDetectedVars[i]);
                if (detVarIndex < 0) {
                    let varNameToDeclare = currLineDetectedVars[i];
                    return varNameToDeclare;
                }
            }
        }
        return "";
    }
}