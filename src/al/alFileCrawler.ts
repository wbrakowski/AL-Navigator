import { TextLine, TextEditor, window, Range, Selection, TextDocument } from 'vscode';
import { ALKeywordHelper } from './alKeyWordHelper';
import { ALFile } from './alFile';

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
            startNo = ALFileCrawler.findLocalProcedureStartLineNo();
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

    export function findNextTextLineNo(text: string, findLastNo: boolean, startNo?: number, endNo?: number) : number
    {
        let editor = window.activeTextEditor;
         if (!editor) {
             return -1;
         }
         let currLineNo = startNo !== undefined ? startNo : editor.selection.active.line + 1;
         let endLineNo = endNo !== undefined ? endNo : editor.document.lineCount;
         let foundLineNo = -1;
         for (let i = currLineNo; i < endLineNo; i++) {
             let currLine = editor.document.lineAt(i);
             let currLineText = currLine.text.toUpperCase().trimLeft();
             if (currLineText.includes(text)) {
                foundLineNo = i; 
                 if (!findLastNo) {
                    return foundLineNo;
                 }
             }
         }
         return foundLineNo;
     }

     export function findProcStubStartingLineNo() : number {
        let searchText : string = "}";
        let foundLineNo : number = findNextTextLineNo(searchText, true, 0);
        let lineNo : number = -1;

        if (foundLineNo >= 0) {
            lineNo = foundLineNo;
        }

        return lineNo;
    }

     //#endregion
     //#region text checking
     export function isLocalProcedureCall(text: string) : boolean {
        let textBeforeBracket: string = "";
        let indexBracket : number = text.indexOf("(");
        if (indexBracket > 0) {
            textBeforeBracket = text.substring(0, indexBracket - 1);
        }
        else {
            return false;
        }
        
        if (textBeforeBracket.indexOf(".") > -1) {
            return false;
        }

        return containsProcedureSigns(text);
    }

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

    export function isGlobalProcedureCall(text: string) : boolean {
        if (text.indexOf(".") < 0) {
            return false;
        }

        if (!containsProcedureSigns(text)) {
            return false;
        }

        return true;
    }

    export function localProcedureAlreadyExists(text: string) : boolean {
        let procedureName = extractProcedureName(text);

        let editor = window.activeTextEditor;
        if (!editor) {
            return false;
        }

        let currFileText = editor.document.getText().toUpperCase();
        let searchText = "PROCEDURE " + procedureName.toUpperCase();

        return(currFileText.includes(searchText));
    }

    export function isComment(textToCheck : string) : boolean {
        return(textToCheck.includes("//"));
    }
     //#endregion
     //#region text disscetion
     export function extractProcedureName(text: string) : string {
        let openingBracketPos : number = text.indexOf("(");
        let closingBracketPos : number = text.indexOf(")");
        if (openingBracketPos < -1 || closingBracketPos < -1) {
            return "";
        }

        let textBeforeOpeningBracket = text.substring(0, openingBracketPos);
        let textToCheck: string = textBeforeOpeningBracket;
        
        let indexDot : number = textBeforeOpeningBracket.indexOf(".");
        if (indexDot > -1) {
            textToCheck = textBeforeOpeningBracket.substr(indexDot + 1);
        }
       
        let procedureName : string = textToCheck.trimLeft();

        let indexEqualSign = procedureName.indexOf("=");
        if (indexEqualSign > -1) {
            procedureName = procedureName.substr(indexEqualSign + 1).trimLeft();
        }

        return procedureName;
    }

    export function extractProcedureNameFromCurrLine() : string {
        let text: string = getCurrLineText();
        return extractProcedureName(text);
    }

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

    export function extractReturnValueName(text : string) : string {
        let colonIndex = text.indexOf(":");
        if (colonIndex > -1) {
            return text.substring(0, colonIndex).trimRight();
        }
        else {
            return "";
        }
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

    export function findParamType(paramName: string): string {
        if (!paramName) {
            return "";
        }
        let paramType = getParamTypeFromLocalVars(paramName);
        if (!paramType) {
            let paramLineNo = findLocalProcedureStartLineNo();
            paramType = getParamTypeFromProcLine(paramLineNo, paramName);
        }
        
        return paramType;
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

    export function getParamTypeFromProcLine(lineNo: number,paramName: string): string {
        let editor = window.activeTextEditor;
        if (!editor || lineNo < 0) {
            return "";
        }
        let paramType: string = ""; 
        let currLine: TextLine = editor.document.lineAt(lineNo);
        let currLineText = currLine.text.toUpperCase();
        let paramNameIndex: number = currLineText.indexOf(paramName.toUpperCase());
        let colonIndex : number = currLineText.indexOf(":", paramNameIndex);
        if(colonIndex > -1) {
            var semiColonIndex : number = currLineText.indexOf(";", colonIndex);
            if (semiColonIndex > -1) {
                paramType = currLine.text.substring(colonIndex + 1, semiColonIndex);
            }
            else {
                let bracketIndex : number = currLineText.indexOf(")", colonIndex);
                if (bracketIndex > -1) {
                    paramType = currLine.text.substring(colonIndex + 1, bracketIndex);
                }
            }
        }
        return paramType;
    }

    export function paramPassedByRef(paramName: string): boolean {
        let lineNo = findLocalProcedureStartLineNo();
        let text = getText(lineNo).toUpperCase();

        let paramNameIndex = text.indexOf(paramName.toUpperCase());
        if (paramNameIndex < 0) {
            return false;
        }
        let textToCheck = text.substring(0, paramNameIndex);
        let lastBracketIndex = textToCheck.lastIndexOf("(");
        let lastSemiColonIndex = textToCheck.lastIndexOf(";"); 
        if (lastBracketIndex < 0 && lastSemiColonIndex < 0) {
            return false;
        }

        let delimiterIndex = lastBracketIndex > lastSemiColonIndex? lastBracketIndex : lastSemiColonIndex;
        textToCheck = textToCheck.substring(delimiterIndex);
        return textToCheck.includes("VAR");
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

    export function getLineText(document: TextDocument, range: Range | Selection) : string {
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

    export function findLocalProcedureStartLineNo() : number {
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

    
    export function procedureExistsInALFile(file: ALFile, procedureName: string): boolean {
        if (!file) {
            return false;
        }

        return (file.procedures.includes(procedureName));
    }

    export function getVarNameToDeclare(document: TextDocument, range: Range | Selection): string {
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