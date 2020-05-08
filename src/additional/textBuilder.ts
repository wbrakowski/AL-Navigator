import { Range } from "vscode";
import { ALFileCrawler } from "../al/alFileCrawler";
import { StringFunctions } from "./stringFunctions";

export module TextBuilder {
    let indent: string = "  ";
    let indentPart: string = "    ";

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