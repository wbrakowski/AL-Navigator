import { Range } from "vscode";
import { ALFileCrawler } from "../al/alFileCrawler";
import { StringFunctions } from "./stringFunctions";
import { VarDeclaration } from "../al/varDeclaration";
import { ALVariable } from "../al/alVariable";

export module TextBuilder {
    let indentPart: string = "    ";
    export function buildVarDeclaration(range: Range, alVariable: ALVariable): VarDeclaration {
        let varDeclaration = new VarDeclaration();
        let declaration: string = "";
        let indentText: string = "";
        let varStartLineNo = alVariable.isLocal? ALFileCrawler.findLocalVarSectionStartLineNo() : ALFileCrawler.findGlobalVarSectionStartLineNo();
        let noWhiteSpaces: number;
        let createVarSection: boolean = false;
        if (varStartLineNo === -1) {
            if (alVariable.isLocal) {
                varStartLineNo = ALFileCrawler.findProcedureStartLineNo();
                if (varStartLineNo > -1) {
                    let procedureText = ALFileCrawler.getText(varStartLineNo);
                    let noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(procedureText);
                    for(let i = 0; i < noWhiteSpaces; i++) {
                        indentText += " ";
                    }
                    declaration = indentText + "var" + "\n";
                }
            }
            else {
                varStartLineNo = ALFileCrawler.findGlobalVarCreationPos();
                if (varStartLineNo > -1) {
                    let noOfWhiteSpaces = 2;
                    for(let i = 0; i < noOfWhiteSpaces; i++) {
                        indentText += " ";
                    }
                    declaration = indentText + "var" + "\n";
                }
            }
            createVarSection = true;
        }
        else {
            let varText = ALFileCrawler.getText(varStartLineNo);
            noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(varText);
            for(let i = 0; i < noWhiteSpaces; i++) {
                indentText += " ";
            }
        }
    
        declaration += indentText + indentPart + alVariable.getVariableDeclarationString();
        varDeclaration.declaration = declaration;
        varDeclaration.createsVarSection = createVarSection;
        return varDeclaration;
    }


   
}