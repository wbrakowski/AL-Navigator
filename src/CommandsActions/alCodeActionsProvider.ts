import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { AddLocalVariableCodeCommand } from './addLocalVariableCodeCommand';
import { ALFiles } from '../al/alFiles';
import { ALWriter } from '../al/alWriter';
import { ALFileCrawler } from '../al/alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    private alFilesPopulated = false;
    protected _alFiles : ALFiles = new ALFiles();
    protected _alWriter : ALWriter = new ALWriter();
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;
    protected _addLocalVariable : AddLocalVariableCodeCommand;

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    constructor(context: vscode.ExtensionContext) {
        this._alNavigatorExtensionContext = context;
        this._addLocalVariable = new AddLocalVariableCodeCommand(this._alNavigatorExtensionContext, "addLocalVariableCommand", this._alFiles, this._alWriter);
    }

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
        if (isUndefined(document)) {
            return;
        }
        this._alFiles.document = document;
        let diagnostic = this._alFiles.getRelevantDiagnosticOfCurrentPosition(range);
        if (isUndefined(diagnostic)) {
            return;
        }
        let actions: vscode.CodeAction[] = [];
        switch (diagnostic.code as string) {
            case DiagnosticCodes.AL0118.toString():
                {
                    let varNameToDeclare = ALFileCrawler.getVarNameToDeclare(document, range);
                    if ((varNameToDeclare) && (this._alFiles.variableNameExists(varNameToDeclare))) {
                        this._addLocalVariable.clearVarsToDeclare();
                        this._addLocalVariable.localVarNameToDeclare = varNameToDeclare;
                        this._addLocalVariable.localVarTypeToDeclare = this._alFiles.getObjectTypeAndNameFromVarName(varNameToDeclare);
                        let action : vscode.CodeAction = new vscode.CodeAction("Add local variable " + varNameToDeclare,  vscode.CodeActionKind.QuickFix);
                        action.command = { 
                            command: this._addLocalVariable.name, title: 'Add local variable' 
                        };
                        actions.push(action);
                    }
                }
                break;
            default: {
                return;
            }
        }
        return actions;
    }

}