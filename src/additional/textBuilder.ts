import { Range } from "vscode";
import { ALFileCrawler } from "../al/alFileCrawler";
import { StringFunctions } from "./stringFunctions";
import { VarDeclaration } from "../al/alVarDeclaration";
import { ALVariable } from "../al/alVariable";
import { CommandType } from "./commandType";
import { ALFile } from "../al/alFile";
import { clear } from "console";

export module TextBuilder {
    let indentPart: string = "    ";
    export function buildVarDeclaration(range: Range, alVariable: ALVariable): VarDeclaration {
        let varDeclaration = new VarDeclaration();
        let declaration: string = "";
        let indentText: string = "";
        let varStartLineNo: number;
        let noWhiteSpaces: number;
        let createVarSection: boolean = false;
        switch (alVariable.cmdType) {
            case CommandType.GlobalVariable: {
                varStartLineNo = ALFileCrawler.findGlobalVarSectionStartLineNo();
                if (varStartLineNo === -1) {
                    {
                        varStartLineNo = ALFileCrawler.findGlobalVarCreationPos();
                        if (varStartLineNo > -1) {
                            let noOfWhiteSpaces = 4;
                            for (let i = 0; i < noOfWhiteSpaces; i++) {
                                indentText += " ";
                            }
                            declaration = indentText + "var" + "\n";
                        }
                    }
                    createVarSection = true;
                }
                break;
            }
            case CommandType.LocalVariable: {
                varStartLineNo = ALFileCrawler.findLocalVarSectionStartLineNo();
                if (varStartLineNo === -1) {
                    varStartLineNo = ALFileCrawler.findProcedureStartLineNo();
                    if (varStartLineNo > -1) {
                        let procedureText = ALFileCrawler.getText(varStartLineNo);
                        let noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(procedureText);
                        for (let i = 0; i < noWhiteSpaces; i++) {
                            indentText += " ";
                        }
                        declaration = indentText + "var" + "\n";
                        createVarSection = true;
                    }
                }

                break;
            }
            case CommandType.Parameter: {
                varStartLineNo = ALFileCrawler.findProcedureStartLineNo();
                let lineText: string = ALFileCrawler.getText(varStartLineNo);
                let openingBracketIdx: number = lineText.lastIndexOf("(");
                let closingBracketIdx: number = lineText.lastIndexOf(")");
                if (openingBracketIdx > -1 && closingBracketIdx > -1) {
                    if (closingBracketIdx - openingBracketIdx !== 1) {
                        // Closing and opening bracket are not next to each other -> there are already existing parameters
                        declaration += "; ";
                    }
                }
                break;
            }
            default: {
                varStartLineNo = -1;
                break;
            }
        }
        if (alVariable.cmdType === CommandType.LocalVariable) {
            indentText = '';
        }
        if (varStartLineNo !== -1 && alVariable.cmdType !== CommandType.Parameter) {
            let varText = ALFileCrawler.getText(varStartLineNo);
            noWhiteSpaces = StringFunctions.getNoOfLeftSpaces(varText);
            for (let i = 0; i < noWhiteSpaces; i++) {
                indentText += " ";
            }
            // if (alVariable.cmdType === CommandType.GlobalVariable && createVarSection) {
            if (createVarSection) {
                indentText += "    ";
            }
        }

        // Only indent for global or local variables, not for parameters
        if (alVariable.cmdType === CommandType.Parameter) {
            declaration += alVariable.getVariableDeclarationString();
        }
        else {
            declaration += createVarSection ? indentText + alVariable.getVariableDeclarationString() : indentText + indentPart + alVariable.getVariableDeclarationString();
        }
        varDeclaration.declaration = declaration;
        varDeclaration.createsVarSection = createVarSection;
        return varDeclaration;
    }
}