import { TextLine, TextEditor, window, Range, Selection, TextDocument, TextEditorCursorStyle, Position } from 'vscode';
import { ALKeywordHelper } from './alKeyWordHelper';
import { ALFile } from './alFile';
import * as vscode from 'vscode';

export module ALFileCrawler {
    //#region text search
    export function findLocalVarSectionStartLineNo() : number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let lastLineNo: number = editor.selection.end.line;
        let foundLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "VAR") {
                foundLineNo = i;
                break;
            } else if (currLineText.includes("TRIGGER")  || currLineText.includes("PROCEDURE")) {
                if (i === lastLineNo) {
                    foundLineNo = i + 1;
                }
                break;
            }
        }
        return foundLineNo;
    }

    export function findLocalVarSectionEndLineNo(procedureNoIfNoVarFound: boolean, startLineNo?: number) : number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let endLineNo: number = -1;

        let startNo: number = startLineNo? startLineNo :  findLocalVarSectionStartLineNo();
        if (startNo < 0 && procedureNoIfNoVarFound) {
            startNo = ALFileCrawler.findProcedureStartLineNo();
        }
        for (let i = startNo; i <= editor.document.lineCount-1; i++) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "BEGIN") {
                endLineNo = i-1;
                break;
            } 
        }
        return endLineNo;
    }

    export function findGlobalVarSectionStartLineNo() : number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let foundLineNo = -1;
        let ignoreNext;
        for (let i = 0; i < editor.document.lineCount; i++) {
            let currLine = editor.document.lineAt(i);
            let currLineText = currLine.text.trim().toUpperCase();
            if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
				ignoreNext = true;
			} else if (currLineText.toUpperCase() === "VAR") {
				if (ignoreNext) {
					ignoreNext = false;
				} else {
					foundLineNo = i;
					break;
				}

			} else if (currLineText.toUpperCase().indexOf("BEGIN") >= 0) {
				ignoreNext = false;
			}
        }
        return foundLineNo;
    }

    export function findGlobalVarSectionEndLineNo(startLineNo?: number) : number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let endLineNo: number = -1;

        let startNo: number = startLineNo? startLineNo :  findGlobalVarSectionStartLineNo();
        if (startNo < 0) {
            return -1;
        }
        for (let i = startNo; i <= editor.document.lineCount-1; i++) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText.includes('PROCEDURE') || currLineText.includes('TRIGGER')) {
                endLineNo = i-2;
                break;
            } 
            else if (currLineText.includes('}')) {
                endLineNo = i;
                break;
            }
        }
        return endLineNo;
    }

    export function findNextTextLineNo(text: string, findLastNo: boolean, startNo?: number, endNo?: number, excludesText?: string) : number
    {
        let editor = window.activeTextEditor;
         if (!editor) {
             return -1;
         }
         let currLineNo = startNo !== undefined ? startNo : editor.selection.active.line + 1;
         let endLineNo = endNo !== undefined ? endNo : editor.document.lineCount;
         let foundLineNo = -1;
         let ignoreLine;
         for (let i = currLineNo; i < endLineNo; i++) {
             let currLine = editor.document.lineAt(i);
             let currLineText = currLine.text.toUpperCase().trimLeft();
             if (currLineText.includes(text)) {
                 if (excludesText){
                     ignoreLine = currLineText.includes(excludesText);
                 }
                 if (!ignoreLine) {
                    foundLineNo = i; 
                    if (!findLastNo) {
                        return foundLineNo;
                    }
                 }
             }
         }
         return foundLineNo;
     }

     //#endregion
     //#region text checking

    function containsProcedureSigns(text: string) : boolean {
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

    export function isComment(textToCheck : string) : boolean {
        return(textToCheck.includes("//"));
    }
     //#endregion
     //#region text disscetion


    export function extractParams(text: string, removeVarFlag: boolean, removeParamType: boolean) : string[] {
        // TODO: Change this to RegExp
        let parameterNames : string[] = [];
        let openingBracketPos : number = text.indexOf("(");
        let closingBracketPos : number = text.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return [];
        }

        let textBetweenBrackets = text.substring(openingBracketPos + 1, closingBracketPos).trim();
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

    export function extractVarNameFromProcCall(text: string) : string {
        let variableName : string = "";
        let dotIndex : number = text.indexOf(".");
        if (dotIndex > -1) {
            variableName = text.substring(0 , dotIndex);
            let equalSign = variableName.indexOf("=");
            if (equalSign > -1) {
                variableName = variableName.substr(equalSign + 1);    
            }
        }

        return variableName;
    }

    export function extractLocalVarNames(startLineNo : number, endLineNo : number) : string[] {
        let localVariables: string[] = new Array();

        let editor = window.activeTextEditor;
        if (editor) {
            for (let i = startLineNo; i <= endLineNo; i++) {
                let currLine : TextLine = editor.document.lineAt(i);
                let currLineText = currLine.text.trim();
                let colonIndex : number = currLineText.indexOf(":");
                let variableName = currLineText.substring(0, colonIndex);
                if (variableName) {
                    localVariables.push(variableName);
                }
            }
        }
        return localVariables;
    }

    export function extractVars(text: string) : string[] {
        let vars: string[] = new Array();
        if (text) {
            let trimmedText = text.trim();
            let varNamePattern = '(\\w[a-zA-Z]*)'; // All characters except "
            let varNameRegExp = new RegExp(varNamePattern, "gi");
            let varNames = trimmedText.match(varNameRegExp);
            if (varNames) {
                for(let i = 0; i < varNames.length; i++) {
                    if (!ALKeywordHelper.isKeyWord(varNames[i]) && (!varNames[i].includes("(") && !varNames[i].includes("\"") && (!varNames[i].includes(".")))) {
                        vars.push(varNames[i]);
                    }
                }
            }
        }
        return vars;
    }

    export function extractLocalVarsAndParams() : string[] {
        let varsAndParams: string[] = new Array();
        let varSectionStartLineNo : number = findLocalVarSectionStartLineNo() + 1;

        if (varSectionStartLineNo > 0) {
            let varSectionEndLineNo : number = findLocalVarSectionEndLineNo(false, varSectionStartLineNo);
            if (varSectionEndLineNo > 0) {
                varsAndParams = extractLocalVarNames(varSectionStartLineNo, varSectionEndLineNo);
                let localParams: string[] = extractParamNamesFromSection(varSectionStartLineNo-2);
                varsAndParams = varsAndParams.concat(localParams);
            }

        }
        return varsAndParams;
    }

    export function extractParamNamesFromSection(paramsLineNo : number) : string[] {
        let paramLineText = getText(paramsLineNo);
        return(extractParams(paramLineText, true, true));
    }
     //#endregion

     export function getText(lineNo : number) : string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let line = editor.document.lineAt(lineNo);
        return(line.text);
    }

    export function getParamTypeFromLocalVars(paramName: string): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let startNo = findLocalVarSectionStartLineNo()+1;
        if (startNo < 0) {
            return "";
        }
        let endNo = findLocalVarSectionEndLineNo(false, startNo);
        for (let i = startNo; i <= endNo; i++) {
            let currLine = editor.document.lineAt(i);
            let currLineText = currLine.text.toUpperCase(); 
            let colonIndex : number = currLineText.indexOf(":");
            if (currLineText.includes(paramName.toUpperCase())) {
                let paramType = currLine.text.substring(colonIndex + 1, currLine.text.length - 1);
                return paramType;
            }
        }
        return "";
    }


    export function getCurrLineText(): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLine = editor.document.lineAt(editor.selection.start.line);
        let currLineText : string = currLine.text;
        
        return currLineText;
    }

    export function getRangeText(range: Range | Selection) : string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let rangeText = editor.document.getText(range).trim();
        return rangeText;
    }

    export function getLineText(range: Range | Selection) : string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText : string = currLine.text.trimLeft();
        if (isComment(currLineText)) {
            return "";
        }
        else {
            return currLineText;
        }
    }

    export function findProcedureStartLineNo() : number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        
        let lastLineNo: number = editor.selection.end.line;
        let foundLocalProcLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim();
           if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
                foundLocalProcLineNo = i;
                break;
            }
        }
        return foundLocalProcLineNo;
    }

    export function getVarNameToDeclare(range: Range | Selection, diagnosticMsg: string): string {
        let rangeText = ALFileCrawler.getRangeText(range);
        let currLineDetectedVars = ALFileCrawler.extractVars(rangeText);
        let localVarsAndParams = ALFileCrawler.extractLocalVarsAndParams();

        for(let i = 0; i< currLineDetectedVars.length; i++) {
            let detVarIndex = localVarsAndParams.indexOf(currLineDetectedVars[i]);
            if (detVarIndex < 0 && diagnosticMsg.includes(currLineDetectedVars[i])) {
                let varNameToDeclare = currLineDetectedVars[i];
                return varNameToDeclare;
            }
        }
        return "";
    }

    
    export function findGlobalVarCreationPos(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let lastLineNo: number = editor.document.lineCount - 1;
        let foundLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "}") {
                foundLineNo = i;
                break;
            } 
        }
        return foundLineNo;
    }

    export function isProcedureCall(diagnosticRange: Range | Selection): boolean {
        // Check if the next character after the diagnostic range is a round opening paranthesis for a procedure call
        let range = new Range(diagnosticRange.start, new Position(diagnosticRange.end.line, diagnosticRange.end.character + 1));
        let rangeText = getRangeText(range);
        return rangeText.includes('(');
    }
}