import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { WorkSpaceALFile} from './workspaceALFile';
import { ALFileCrawler } from './alFileCrawler';
import { StringFunctions } from './stringFunctions';
     
  export class ALFiles {
    public workspaceALFiles : WorkSpaceALFile[]; 
    private indentText : string;
    private indentPart : string;
    public content : string;
    public currentSelectionProcedureName : string = "";
    public currentRemoteALFile: WorkSpaceALFile | undefined;

    constructor() {
        this.workspaceALFiles = this.populateALFilesArray();
        this.content = "";
        this.indentText = "";
        this.indentPart = "    ";
    }

    public repopulateALFIlesArray() {
        this.workspaceALFiles = this.populateALFilesArray();
    }

    public procedureStubStartingLineNo() : number {
        let searchText : string = "}";
        let foundLineNo : number = ALFileCrawler.findNextTextLineNo(searchText, true, 0);
        let lineNo : number = -1;

        if (foundLineNo >= 0) {
            lineNo = foundLineNo;
        }

        return lineNo;
    }


    public buildProcedureStubText(startingWithLocal: boolean): string {
        let editor = this.getActiveTextEditor();
        if (!editor) {
            return "";
        }

        let currentLineNo = editor.selection.active.line;
        let currentLineText = ALFileCrawler.getText(currentLineNo);
        let procedureName = ALFileCrawler.extractProcedureName(currentLineText);
        let parameterNames = ALFileCrawler.extractParams(currentLineText, false, false);
        let returnValueName = ALFileCrawler.extractReturnValueName(currentLineText).trimLeft();
        let returnValueType = ALFileCrawler.findParamType(returnValueName);
        let procedureStub : string;
        startingWithLocal? procedureStub = "local procedure " + procedureName + "(" : procedureStub = "procedure " + procedureName + "(";
        
        let parameterType : string;
        let i : number = 0;
        if (parameterNames.length === 0) {
            procedureStub += ")";
        } 
        else {
            while (i < parameterNames.length) {
                {
                    parameterType = ALFileCrawler.findParamType(parameterNames[i]);
                    procedureStub += parameterNames[i] + " :" + parameterType;
                    parameterNames[i + 1] === undefined ? procedureStub += ")" : procedureStub += "; ";
                    i++;
                }
            }
        }

        if (returnValueType) {
            procedureStub += " : " + returnValueType;
        }

        let indentPart = "    ";

        let procedureStubWithBody: string = procedureStub;
        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += "begin";
        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += indentPart;

        let errorText : string = 'TODO: Implement ' + procedureStub;        
        procedureStubWithBody += "// " + errorText;
        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += indentPart;
        procedureStubWithBody += "Error('" + errorText + "');";
        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += "end;";

        return procedureStubWithBody;
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

    private ClearCurrentSelectionValues() : void {
        this.currentRemoteALFile = undefined;
        this.currentSelectionProcedureName = "";
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

    private getActiveTextEditor() : vscode.TextEditor | undefined {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
         }
        return editor;
    }

    public toString() : string {
        return this.content;
    }

    public incIndent() {
        this.indentText += this.indentPart;
    }

    public decIndent() {
        if (this.indentText.length > this.indentPart.length){
            this.indentText = this.indentText.substr(0, this.indentText.length - this.indentPart.length);
        }
        else {
            this.indentText = "";
        }
    }

    public writeLine(line : string) {
        this.content += (this.indentText + line + "\n");
    }

    public writeProcedureStub(procedureStub: string) {
        this.writeLine(procedureStub);
    }

    public clearContent() {
        this.content = "";
        this.indentText = "";
        this.indentPart = "    ";
    }


    public getCurrentLineTextFromRange(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText : string = currLine.text.trimLeft();
        if (ALFileCrawler.isComment(currLineText)) {
            return "";
        }
        else {
            return currLineText;
        }
    }

   

    public findLocalProcedureStartLineNo(range: vscode.Range | vscode.Selection) : number {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        
        let lastLineNo: number = range.end.line;
        let foundLocalProcLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: vscode.TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim();
           if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
                foundLocalProcLineNo = i;
                break;
            }
        }
        return foundLocalProcLineNo;
    }
}