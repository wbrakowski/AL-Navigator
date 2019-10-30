import * as vscode from 'vscode';
import { ALAddProcedureStubCodeCommand } from './addProcedureStubCodeCommand';
import { ALNavigatorExtensionContext } from './alNavigatorExtensionContext';
import { ALFileOperations } from './alFileOperations';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alNavigatorExtensionContext : ALNavigatorExtensionContext;
    protected _addProcedureStub : ALAddProcedureStubCodeCommand;

    constructor(context: ALNavigatorExtensionContext) {
        this._alNavigatorExtensionContext = context;
        this._addProcedureStub = new ALAddProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addProcedureStubCommand");
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        let actions: vscode.CodeAction[] = [];

        if (ALFileOperations.checkIfSelectionIsNotExistingProcedureCall(document, range)) {

            let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub", vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addProcedureStub.name, title: 'Add Procedure Stub' 
            };
            actions.push(action);
        }
        
        return actions;
    }

    

}