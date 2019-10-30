import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export module ALFileOperations {
    export function procedureStubStartingLineNo() : number {
        let searchText : string = "}";
        let foundLineNo : number = findNextTextOccurence(searchText, true, 0);

        let lineNo : number;

        if (foundLineNo <= 0) {
            lineNo = -1;
        }
        else {
            lineNo = foundLineNo;
        }

        return lineNo;
    }

    export function findNextTextOccurence(searchText : string, returnLastOccurence : boolean, startingLineNo: number) : number {
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

    export function buildProcedureStubText(): string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currentLineNo = editor.selection.active.line;
        let currentLineText = getCurrentLineText(currentLineNo);
        let procedureName = extractProcedureNameFromText(currentLineText);
        let parameterNames = extractParameterNamesFromText(currentLineText);
        let procedureStub = "local procedure " + procedureName + "(";
        let parameterType : string;
        let i : number = 0;
        if (parameterNames.length === 0) {
            procedureStub += ")";
        } 
        else {
            while (i < parameterNames.length) {
                {
                    parameterType = findTypeForName(parameterNames[i]);
                    procedureStub += parameterNames[i] + " :" + parameterType;
                    parameterNames[i + 1] === undefined ? procedureStub += ")" : procedureStub += "; ";
                    i++;
                }
            }
        }

        return procedureStub;
    }

    export function findTypeForName(parameterName: string): string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
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
            parameterNameLineNo = findNextTextOccurence(parameterName.toUpperCase(), false, foundLocalVarLineNo);
            if (parameterNameLineNo > -1) {
                currLine = editor.document.lineAt(parameterNameLineNo);
                let currLineTextUpperCase = currLine.text.toUpperCase();
                let colonIndex : number = currLineTextUpperCase.indexOf(":");
                parameterType = currLine.text.substring(colonIndex + 1, currLine.text.length - 1);
            }
        }

        return parameterType;
    }



    export function getCurrentLineText(lineNo : number) : string {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let currLine = editor.document.lineAt(lineNo);
        return(currLine.text);
    }

    export function extractProcedureNameFromText(text: string) : string {
        let openingBracketPos : number = text.indexOf("(");
        let closingBracketPos : number = text.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return "";
        }

        let textBeforeOpeningBracket = text.substring(0, openingBracketPos);
        let procedureName : string = textBeforeOpeningBracket.trimLeft();

        return procedureName;
    }

    export function extractParameterNamesFromText(text: string) : string[] {
        let parameterNames : string[] = [];
        let openingBracketPos : number = text.indexOf("(");
        let closingBracketPos : number = text.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return [];
        }

        let textBetweenBrackets = text.substring(openingBracketPos + 1, closingBracketPos);
        let nextCommaPos : number = textBetweenBrackets.indexOf(",");
        if (nextCommaPos > -1) {
            let parameterNameToPush : string  = textBetweenBrackets.substring(0, nextCommaPos);
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

        return parameterNames;
    }

    // TODO: Functions for release 0.0.5
    // export function extractProcedureOwnerVariableNameFromText(text: string) : string {
    //     let variableName : string = "";
    //     let dotIndex : number = text.indexOf(".");
    //     if (dotIndex > -1) {
    //         variableName = text.substring(0 , dotIndex);
    //     }

    //     return variableName;
    // }

    export function checkIfSelectionIsNotExistingProcedureCall(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) : boolean {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText = currLine.text.trimLeft();
        if (checkIfTextIsComment(currLineText)) {
            return false;
        }
        if (checkIfTextIsLocalProcedureCall(currLineText)) {
            if (!checkIfLocalProcedureAlreadyExists(currLineText)) {
                return true;
            }
        }

        //TODO: also activate functionality if procedure is for other object than the currently opened
        
        // if (checkIfTextIsGlobalProcedureCall(currLineText)) {
        //     let procedureOwnerVariableName = extractProcedureOwnerVariableNameFromText(currLineText);
        //     let procedureOwnerVariableType = findTypeForName(procedureOwnerVariableName).trimLeft();
        //     findProcedureOwnerFile(procedureOwnerVariableType);
        //     if (!checkIfGlobalProcedureAlreadyExists(currLineText)) {
        //         return true;
        //     }
        // }
        
        return false;
    }

    // export function findProcedureOwnerFile(objectTypeObjectName : string) : string{
    //     let objectTypeObjectNameUpperCase = objectTypeObjectName.toUpperCase();
    //     let spaceIndex : number = objectTypeObjectName.indexOf(" ");
    //     if (spaceIndex > -1) {
    //         let objectType : string = objectTypeObjectName.substring(0, spaceIndex);
    //         let objectName : string = objectTypeObjectName.substring(spaceIndex + 1, objectTypeObjectName.length);
    //         //let searchPattern : string = '**/*{*' + objectName + '*}.al*';
    //         let searchPattern : string = '**/*.al*';
    //         console.group('searchpattern: ' + searchPattern);
    //         getAlFilesFromCurrentWorkspace(searchPattern).then(Files => {
    //             try {
    //                 Files.forEach(file => {
    //                     vscode.text
    //                     console.log(file.fsPath);
    //                 });
    //             } catch (error) {
    //                 vscode.window.showErrorMessage(error.message);
    //             }

    //             //WorkspaceFiles.ReopenFilesInEditor(renamedfiles);
    //         });    
    //     }
    //     return "";
    // }
        
    export function checkIfTextIsComment(textToCheck : string) : boolean {
        if (textToCheck.indexOf("//") > -1) {
            return true;
        }
        return false;
    }

    export function checkIfLocalProcedureAlreadyExists(text: string) : boolean {
        let procedureName : string = extractProcedureNameFromText(text);

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

    export function checkIfGlobalProcedureAlreadyExists(text: string) : boolean {
        let procedureName : string = extractProcedureNameFromText(text);

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

    export function checkIfTextIsLocalProcedureCall(text: string) : boolean {
        if (text.indexOf(".") > -1) {
            return false;
        }

        return checkIfTextContainsProcedureSigns(text);
    }

    export function checkIfTextIsGlobalProcedureCall(text: string) : boolean {
        if (text.indexOf(".") < 0) {
            return false;
        }

        if (!checkIfTextContainsProcedureSigns(text)) {
            return false;
        }

        return true;
    }

    export function checkIfTextContainsProcedureSigns(text: string) : boolean {
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

    // TODO: FUnctions in next release 0.0.5

    // export function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined{
    //     if (vscode.workspace.workspaceFolders) {
    //         let workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.workspace.workspaceFolders[0].uri);

    //         let activeTextEditorDocumentUri = null;
    //         try {
    //             if (vscode.window.activeTextEditor) {
    //                 activeTextEditorDocumentUri = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
    //             }
    //         } catch (error) {
    //             activeTextEditorDocumentUri = null;
    //         }
    
    //         if (activeTextEditorDocumentUri) { 
    //             workspaceFolder = activeTextEditorDocumentUri;
    //         }
    
    //         return workspaceFolder;
    //     }
    // }

       
    // export function getCurrentWorkspaceFolderFromUri(filePath: vscode.Uri): vscode.WorkspaceFolder | undefined {
    //     let workspaceFolder = vscode.workspace.getWorkspaceFolder(filePath);

    //     return workspaceFolder;
    // }
    // export function getAlFilesFromCurrentWorkspace(searchPattern : string) {
    //     let activeTextEditorDocumentUri = getCurrentWorkspaceFolder();

    //     if (activeTextEditorDocumentUri) {
    //         return vscode.workspace.findFiles(new vscode.RelativePattern(activeTextEditorDocumentUri, searchPattern));
    //     } else {
    //         return vscode.workspace.findFiles(searchPattern);
    //     }
    // }

}