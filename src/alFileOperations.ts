import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { WorkSpaceALFile} from './workspaceALFile';
    
  export class ALFileOperations {
    private _workspaceALFiles : WorkSpaceALFile[]; 
    public currentSelectionProcedureName : string = "";
    public currentRemoteALFile: WorkSpaceALFile | undefined;


    constructor() {
        this._workspaceALFiles = this.populateALFilesArray();
    }

    public repopulateALFIlesArray() {
        this._workspaceALFiles = this.populateALFilesArray();
    }

    public procedureStubStartingLineNo() : number {
        let searchText : string = "}";
        let foundLineNo : number = this.findNextTextOccurence(searchText, true, 0);

        let lineNo : number = -1;

        if (foundLineNo >= 0) {
            lineNo = foundLineNo;
        }

        return lineNo;
    }

    private findNextTextOccurence(searchText : string, returnLastOccurence : boolean, startingLineNo: number) : number {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        
        let currentLineNo = startingLineNo;
        let foundLineNo : number = -1;
        
        for (let i = currentLineNo; i < editor.document.lineCount; i++) {
            let currLine = editor.document.lineAt(i);
            let currLineText = currLine.text.toUpperCase();
            currLineText = currLineText.trimLeft();
            currLineText = currLineText.substr(0, searchText.length);
            if (currLineText.indexOf(searchText) > -1) {
                foundLineNo = i;
                if (!returnLastOccurence) {
                    return foundLineNo;
                }
            }
        }

        return foundLineNo;
    }

    public buildProcedureStubText(startingWithLocal: boolean): string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currentLineNo = editor.selection.active.line;
        let currentLineText = this.getCurrentLineText(currentLineNo);
        let procedureName = this.extractProcedureNameFromText(currentLineText);
        let parameterNames = this.extractParameterNamesFromText(currentLineText);
        let returnValueName = this.extractReturnValueNameFromText(currentLineText).trimLeft();
        let returnValueType = this.findTypeForName(returnValueName);
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
                    parameterType = this.findTypeForName(parameterNames[i]);
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

    private findTypeForName(parameterName: string): string {
        let editor = vscode.window.activeTextEditor;
        if (!editor || !parameterName) {
            return "";
        }

        // Find local var section
		let selectedRange: vscode.Range = editor.selection;
		let lastLineNo: number = selectedRange.end.line;
        let foundLocalVarLineNo: number = -1;
        let currLine : vscode.TextLine;
        let currLineText : string;
		for (let i = lastLineNo; i >= 0; i--) {
			currLine = editor.document.lineAt(i);
			currLineText  = currLine.text.trim();
			if (currLineText.toUpperCase() === "VAR") {
				foundLocalVarLineNo = i;
				break;
			} else if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
				if (i === lastLineNo) {
					foundLocalVarLineNo = i + 1;
				}
				break;
			}
        }

        let parameterType : string = "";
        
        let parameterNameLineNo : number;
        // Local var section found
        if (foundLocalVarLineNo >= 0) {
            parameterNameLineNo = this.findNextTextOccurence(parameterName.toUpperCase(), false, foundLocalVarLineNo);
            if (parameterNameLineNo > -1) {
                currLine = editor.document.lineAt(parameterNameLineNo);
                let currLineTextUpperCase = currLine.text.toUpperCase();
                let colonIndex : number = currLineTextUpperCase.indexOf(":");
                parameterType = currLine.text.substring(colonIndex + 1, currLine.text.length - 1);
            }
        }

        return parameterType;
    }

    private getCurrentLineText(lineNo : number) : string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let currLine = editor.document.lineAt(lineNo);
        return(currLine.text);
    }

    private extractProcedureNameFromText(text: string) : string {
        let textToCheck : string = "";
        let indexDot : number = text.indexOf(".");
        if (indexDot > -1) {
            textToCheck = text.substr(indexDot + 1);
        }
        else {
            textToCheck = text;
        }

        let openingBracketPos : number = textToCheck.indexOf("(");
        let closingBracketPos : number = textToCheck.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return "";
        }

        let textBeforeOpeningBracket = textToCheck.substring(0, openingBracketPos);
        let procedureName : string = textBeforeOpeningBracket.trimLeft();

        let indexEqualSign = procedureName.indexOf("=");
        if (indexEqualSign > -1) {
            procedureName = procedureName.substr(indexEqualSign + 1).trimLeft();
        }

        return procedureName;
    }

    private extractParameterNamesFromText(text: string) : string[] {
        let parameterNames : string[] = [];
        let openingBracketPos : number = text.indexOf("(");
        let closingBracketPos : number = text.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return [];
        }

        let textBetweenBrackets = text.substring(openingBracketPos + 1, closingBracketPos);
        let nextCommaPos : number = textBetweenBrackets.indexOf(",");
        let parameterNameToPush : string = "";
        if (nextCommaPos > -1) {
            parameterNameToPush  = textBetweenBrackets.substring(0, nextCommaPos);
            do {
                if (parameterNameToPush !== "") {
                    parameterNames.push(parameterNameToPush);
                }
                let lastCommaPos = nextCommaPos;
                nextCommaPos = textBetweenBrackets.indexOf(",", lastCommaPos + 1);
                if (nextCommaPos < 0) {
                    parameterNameToPush = textBetweenBrackets.substr(lastCommaPos + 1, textBetweenBrackets.length - lastCommaPos);
                    parameterNameToPush = parameterNameToPush.trimLeft();
                    parameterNames.push(parameterNameToPush);
                }
                else  {
                    parameterNameToPush = textBetweenBrackets.substring(lastCommaPos + 1, nextCommaPos);
                    parameterNameToPush = parameterNameToPush.trimLeft();
                }
                
            } while (nextCommaPos > -1);
        }
        else {
            if (textBetweenBrackets !== "") {
                parameterNameToPush = textBetweenBrackets;
                parameterNames.push(parameterNameToPush);
            }
        }

        return parameterNames;
    }

    private extractProcedureOwnerVariableNameFromText(text: string) : string {
        let variableName : string = "";
        let dotIndex : number = text.indexOf(".");
        if (dotIndex > -1) {
            variableName = text.substring(0 , dotIndex);
            let equalSign = variableName.indexOf("=");
            if (equalSign > -1) {
                variableName = text.substr(equalSign + 1);    
            }
        }

        return variableName;
    }

    public checkIfSelectionIsNotExistingLocalProcedureCall(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        this.ClearCurrentSelectionValues();
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trim();
        if (this.checkIfTextIsComment(currLineText)) {
            return false;
        }
        if (this.checkIfTextIsLocalProcedureCall(currLineText)) {
            if (!this.checkIfLocalProcedureAlreadyExists(currLineText)) {
                return true;
            }
        }
        
        return false;
    }

    private ClearCurrentSelectionValues() : void {
        this.currentRemoteALFile = undefined;
        this.currentSelectionProcedureName = "";
    }

    public checkIfSelectionIsNotExistingRemoteProcedureCall(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        this.ClearCurrentSelectionValues();
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trimLeft();
        if (this.checkIfTextIsComment(currLineText)) {
            return false;
        }
        
        if (this.checkIfTextIsGlobalProcedureCall(currLineText)) {
            let procedureName : string = this.extractProcedureNameFromText(currLineText);
            let procedureOwnerVariableName = this.extractProcedureOwnerVariableNameFromText(currLineText);
            let procedureOwnerVariableType = this.findTypeForName(procedureOwnerVariableName).trimLeft();
            let indexSpace = procedureOwnerVariableType.indexOf(" ");
            let objectType = procedureOwnerVariableType.substr(0, indexSpace);
            let objectName = procedureOwnerVariableType.substr(indexSpace + 1);
            objectName = this.removeDoubleQuotesFromString(objectName);
            let remoteALFile = this._workspaceALFiles.find(i => i.objectName === objectName);
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

    private removeDoubleQuotesFromString(text : string) : string {
        return text.replace(/"/g,"");
    }

 
        
    private checkIfTextIsComment(textToCheck : string) : boolean {
        if (textToCheck.indexOf("//") > -1) {
            return true;
        }
        return false;
    }

    private checkIfLocalProcedureAlreadyExists(text: string) : boolean {
        let procedureName : string = this.extractProcedureNameFromText(text);

        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currFileTextUpperCase : string = editor.document.getText().toUpperCase();
        let searchText : string = "PROCEDURE " + procedureName.toUpperCase();

        if (currFileTextUpperCase.indexOf(searchText) > -1) {
            return true;
        }
        else {
            return false;
        }
    }


    private checkIfTextIsLocalProcedureCall(text: string) : boolean {
        if (text.indexOf(".") > -1) {
            return false;
        }

        return this.checkIfTextContainsProcedureSigns(text);
    }

    private checkIfTextIsGlobalProcedureCall(text: string) : boolean {
        if (text.indexOf(".") < 0) {
            return false;
        }

        if (!this.checkIfTextContainsProcedureSigns(text)) {
            return false;
        }

        return true;
    }

    private checkIfTextContainsProcedureSigns(text: string) : boolean {
        let textUpperCase = text.toUpperCase();

        if ((textUpperCase.indexOf("(") < 0) || (textUpperCase.indexOf(")") < 0)) {
            return false;
        }

        if (!textUpperCase.endsWith(";")) {
            return false;
        }

        if ((textUpperCase.indexOf("PROCEDURE") > -1)  && (textUpperCase.indexOf("TRIGGER") > -1)) {
            return false;
        }
        return true;
    }

    private extractReturnValueNameFromText(textToCheck : string) : string {
        let colonIndex = textToCheck.indexOf(":");
        if (colonIndex > -1) {
            return textToCheck.substring(0, colonIndex).trimRight();
        }
        else {
            return "";
        }
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
        console.group('searchpattern: ' + searchPattern);

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
  }