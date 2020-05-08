import * as vscode from 'vscode';
import { ALFiles } from '../al/alFiles';
import { ALFileCrawler } from '../al/alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALVariable } from '../al/alVariable';
import { TextBuilder } from '../additional/textBuilder';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();
    // protected _alNavigatorExtensionContext : vscode.ExtensionContext;

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    // constructor(context: vscode.ExtensionContext) {
    //     this._alNavigatorExtensionContext = context;
    // }

    // provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    //     let actions: vscode.CodeAction[] = [];

    //     let varNameToDeclare = ALFileCrawler.getVarNameToDeclare(document, range);
    //     if ((varNameToDeclare) && (this._alFiles.variableNameExists(varNameToDeclare))) {
    //         this._addLocalVariable.clearVarsToDeclare();
    //         this._addLocalVariable.localVarNameToDeclare = varNameToDeclare;
    //         this._addLocalVariable.localVarTypeToDeclare = this._alFiles.getObjectTypeAndNameFromVarName(varNameToDeclare);
    //         let action : vscode.CodeAction = new vscode.CodeAction("Add local variable " + varNameToDeclare,  vscode.CodeActionKind.QuickFix);
    //         action.command = { 
    //             command: this._addLocalVariable.name, title: 'Add local variable' 
    //         };
    //         actions.push(action);
    //     }
        
    //     return actions;
    // }

    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        if (!document) {
            return;
        }
        this._alFiles.document = document;
        let diagnostic = this._alFiles.getRelevantDiagnosticOfCurrentPosition(range);
        if (!diagnostic) {
            return;
        }

        let varToCreate = await this.createVarDeclaration(document, diagnostic);
        if (!varToCreate) {
            return;
        }

        let createVarCodeAction: vscode.CodeAction | undefined;
        createVarCodeAction = await this.createCodeAction(document, diagnostic, varToCreate);
        if (!createVarCodeAction) {
            return;
        } else {
            return [createVarCodeAction];
        }
    }


        // let actions: vscode.CodeAction[] = [];
        // switch (diagnostic.code as string) {
        //     case DiagnosticCodes.AL0118.toString():
        //         {
        //             let varNameToDeclare = ALFileCrawler.getVarNameToDeclare(document, range);
        //             if ((varNameToDeclare) && (this._alFiles.variableNameExists(varNameToDeclare))) {
        //                 this._addLocalVariable.clearVarsToDeclare();
        //                 this._addLocalVariable.localVarNameToDeclare = varNameToDeclare;
        //                 this._addLocalVariable.localVarTypeToDeclare = this._alFiles.getObjectTypeAndNameFromVarName(varNameToDeclare);
        //                 let action : vscode.CodeAction = new vscode.CodeAction("Add local variable " + varNameToDeclare,  vscode.CodeActionKind.QuickFix);
        //                 action.command = { 
        //                     command: this._addLocalVariable.name, title: 'Add local variable' 
        //                 };
        //                 actions.push(action);
        //             }
        //         }
        //         break;
        //     default: {
        //         return;
        //     }
        // }
        // return actions;

        public async createVarDeclaration(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<ALVariable | undefined> {
            let varNameToDeclare = ALFileCrawler.getVarNameToDeclare(document, diagnostic.range);
            if (varNameToDeclare === '') {
                return;
            }
            let returnType: string | undefined;
            let alVariable = new ALVariable(varNameToDeclare);
            // if (this._alFiles.variableNameExists(varNameToDeclare)) {
                returnType = await this._alFiles.getObjectTypeAndNameFromVarName(varNameToDeclare);
                if (returnType) {
                    alVariable.objectType = returnType;
                }
            // }
            return alVariable;
        }

        private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, varToCreate: ALVariable): Promise<vscode.CodeAction | undefined> {
            let createVarCodeAction: vscode.CodeAction | undefined;
            switch (diagnostic.code as string) {
                case DiagnosticCodes.AL0118.toString():
                    createVarCodeAction = await this.createVarCodeActionForLine(varToCreate, currentDocument, diagnostic.range, diagnostic.range.start.line);
                    break;
                default:
                    return;
            }
    
            if (!createVarCodeAction) {
                return;
            } 
            else {
                return createVarCodeAction;
            }
        }

        private async createVarCodeActionForLine(alVariable: ALVariable, document: vscode.TextDocument, range: vscode.Range, currentLineNo?: number): Promise<vscode.CodeAction> {
            let action : vscode.CodeAction = new vscode.CodeAction(`Add local variable ${alVariable.name}`,  vscode.CodeActionKind.QuickFix);
            action.edit = new vscode.WorkspaceEdit();

            let lineNo = ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1;
            let position: vscode.Position = new vscode.Position(lineNo, 0);
            let content = TextBuilder.buildLocalVarDeclaration(range, alVariable.name, alVariable.objectType);
            content += '\n';
            action.edit.insert(document.uri, position, content);

            return action;
        }
    }