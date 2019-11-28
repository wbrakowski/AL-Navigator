import { window, Range } from "vscode";
import { ALFileCrawler } from "./al/alFileCrawler";
import { StringFunctions } from "./stringFunctions";
import { stringify } from "querystring";

export module TextBuilder {
    let indent: string = "  ";
    let indentPart: string = "    ";
    export function buildProcedureStubText(prefixLocal: boolean): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLineNo = editor.selection.active.line;
        let currLineText = ALFileCrawler.getText(currLineNo);
        let procedureName = ALFileCrawler.extractProcedureName(currLineText);
        let parameterNames = ALFileCrawler.extractParams(currLineText, false, false);
        let returnValueName = ALFileCrawler.extractReturnValueName(currLineText).trimLeft();
        let returnValueType = ALFileCrawler.findParamType(returnValueName);
        let procedureStub : string;
        prefixLocal? procedureStub = "local procedure " + procedureName + "(" : procedureStub = "procedure " + procedureName + "(";
        
        let parameterType : string;
        let i : number = 0;
        if (parameterNames.length === 0) {
            procedureStub += ")";
        } 
        else {
            while (i < parameterNames.length) {
                {
                    parameterType = ALFileCrawler.findParamType(parameterNames[i]);
                    if (ALFileCrawler.paramPassedByRef(parameterNames[i])) {
                        procedureStub += "var ";
                    }
                    procedureStub += parameterNames[i] + " :" + parameterType;
                    parameterNames[i + 1] === undefined ? procedureStub += ")" : procedureStub += "; ";
                    i++;
                }
            }
        }

        if (returnValueType) {
            procedureStub += " : " + returnValueType;
        }

        let procedureStubWithBody: string = procedureStub;

        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += "begin";
        procedureStubWithBody += "\n";
        procedureStubWithBody += indentPart;
        procedureStubWithBody += indentPart;

        let errorText : string = 'TODO: Implement ' + procedureStub.replace("procedure", "");        
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

    export function buildLocalVarDeclaration(range: Range, varName: string, varType: string): string {
        let indentText: string = "";
        let varDeclaration: string = "";
        let localVarStartLineNo = ALFileCrawler.findLocalVarSectionStartLineNo();
        let noWhiteSpaces: number;
        if (localVarStartLineNo === -1) {
            localVarStartLineNo = ALFileCrawler.findLocalProcedureStartLineNo();
            if (localVarStartLineNo > -1) {
                let procedureText = ALFileCrawler.getText(localVarStartLineNo);
                let noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(procedureText);
                for(let i = 0; i < noWhiteSpaces; i++) {
                    indentText += " ";
                }
                varDeclaration = indentText + "var" + "\n";
            }
            else {
                
            }
        }
        else {
            let varText = ALFileCrawler.getText(localVarStartLineNo);
            noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(varText);
            for(let i = 0; i < noWhiteSpaces; i++) {
                indentText += " ";
            }
        }
    
        let localVarEndLineNo = ALFileCrawler.findLocalVarSectionEndLineNo(false, localVarStartLineNo);
        if (localVarEndLineNo < 0) {
            return "";
        }
    
        // varDeclaration += "        " + varName + ": " + varType + ";";
        varDeclaration += indentText + indentPart + varName + ": " + varType + ";";
        return varDeclaration;
    }


   
}