import * as vscode from 'vscode';
import { ALAddRemoteProcedureStubCodeCommand } from './addRemoteProcedureStubCodeCommand';
import { ALAddLocalProcedureStubCodeCommand } from './addLocalProcedureStubCodeCommand';
import { ALFileOperations } from '../alFileOperations';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;
    protected _addRemoteProcedureStub : ALAddRemoteProcedureStubCodeCommand;
    protected _addLocalProcedureStub : ALAddLocalProcedureStubCodeCommand;

    constructor(context: vscode.ExtensionContext) {
        this._alNavigatorExtensionContext = context;
        let alFileOperations : ALFileOperations = new ALFileOperations();
        this._addRemoteProcedureStub = new ALAddRemoteProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addRemoteProcedureStubCommand", alFileOperations);
        this._addLocalProcedureStub = new ALAddLocalProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addLocalProcedureStubCommand", alFileOperations);
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        let actions: vscode.CodeAction[] = [];

        if (this._addLocalProcedureStub.alFileOperations.checkIfSelectionIsNotExistingLocalProcedureCall(document, range)) {
            let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub", vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addLocalProcedureStub.name, title: 'Add Procedure Stub' 
            };
            actions.push(action);
        } 
        else if (this._addRemoteProcedureStub.alFileOperations.checkIfSelectionIsNotExistingRemoteProcedureCall(document, range)) {
            if (this._addRemoteProcedureStub.alFileOperations.currentRemoteALFile) {
                this._addRemoteProcedureStub.targetALFileName = this._addRemoteProcedureStub.alFileOperations.currentRemoteALFile.fileName;
                this._addRemoteProcedureStub.targetALObjectName = this._addRemoteProcedureStub.alFileOperations.currentRemoteALFile.objectName;
                this._addRemoteProcedureStub.targetALProcedureName = this._addRemoteProcedureStub.alFileOperations.currentSelectionProcedureName;
                this._addRemoteProcedureStub.targetALFilePath = this._addRemoteProcedureStub.alFileOperations.currentRemoteALFile.filePath;
            }
            
            let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub in " + this._addRemoteProcedureStub.targetALObjectName,  vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addRemoteProcedureStub.name, title: 'Add Procedure Stub' 
            };
            actions.push(action);
        }
        
        return actions;
    }

    

}