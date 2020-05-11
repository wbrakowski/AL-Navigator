import { Range } from "vscode";
import { ALFileCrawler } from "../al/alFileCrawler";
import { StringFunctions } from "./stringFunctions";

export module TextBuilder {
    let indent: string = "  ";
    let indentPart: string = "    ";

    export function buildVarDeclaration(range: Range, varName: string, varType: string, local: boolean): string {
        let indentText: string = "";
        let varDeclaration: string = "";
        let varStartLineNo = local? ALFileCrawler.findLocalVarSectionStartLineNo() : ALFileCrawler.findGlobalVarSectionStartLineNo();
        let noWhiteSpaces: number;
        if (varStartLineNo === -1) {
            if (local) {
                varStartLineNo = ALFileCrawler.findProcedureStartLineNo();
                if (varStartLineNo > -1) {
                    let procedureText = ALFileCrawler.getText(varStartLineNo);
                    let noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(procedureText);
                    for(let i = 0; i < noWhiteSpaces; i++) {
                        indentText += " ";
                    }
                    varDeclaration = indentText + "var" + "\n";
                }
            }
            else {
                varStartLineNo = ALFileCrawler.findGlobalVarCreationPos();
                if (varStartLineNo > -1) {
                    let noOfWhiteSpaces = 2;
                    for(let i = 0; i < noOfWhiteSpaces; i++) {
                        indentText += " ";
                    }
                    varDeclaration = indentText + "var" + "\n";
                }
            }
        }
        else {
            let varText = ALFileCrawler.getText(varStartLineNo);
            noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(varText);
            for(let i = 0; i < noWhiteSpaces; i++) {
                indentText += " ";
            }
        }
    
        let varEndLineNo = local? ALFileCrawler.findLocalVarSectionEndLineNo(false, varStartLineNo) : ALFileCrawler.findGlobalVarSectionEndLineNo(varStartLineNo);
        if (varEndLineNo < 0) {
            return "";
        }
    
        // varDeclaration += "        " + varName + ": " + varType + ";";
        varDeclaration += indentText + indentPart + varName + ": " + varType + ";";
        return varDeclaration;
    }


   
}