import * as vscode from 'vscode';
import { ALAddRemoteProcedureStubCodeCommand } from './addRemoteProcedureStubCodeCommand';
import { ALAddLocalProcedureStubCodeCommand } from './addLocalProcedureStubCodeCommand';
import { AddLocalVariableCodeCommand } from './addLocalVariableCodeCommand';
import { ALFiles } from '../al/alFiles';
import { ALWriter } from '../al/alWriter';
import { ALFileCrawler } from '../al/alFileCrawler';
import { ALFile } from '../al/alFile';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();
    protected _alWriter : ALWriter = new ALWriter();
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;
    protected _addRemoteProcedureStub : ALAddRemoteProcedureStubCodeCommand;
    protected _addLocalProcedureStub : ALAddLocalProcedureStubCodeCommand;
    protected _addLocalVariable : AddLocalVariableCodeCommand;

    constructor(context: vscode.ExtensionContext) {
        this._alNavigatorExtensionContext = context;
        this._addRemoteProcedureStub = new ALAddRemoteProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addRemoteProcedureStubCommand", this._alWriter);
        this._addLocalProcedureStub = new ALAddLocalProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addLocalProcedureStubCommand", this._alWriter);
        this._addLocalVariable = new AddLocalVariableCodeCommand(this._alNavigatorExtensionContext, "addLocalVariableCommand", this._alFiles, this._alWriter);
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        let actions: vscode.CodeAction[] = [];
        
        if (this._alFiles.localProcCanBeCreated(document, range)) {
            let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub", vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addLocalProcedureStub.name, title: 'Add Procedure Stub' 
            };
            actions.push(action);
        } 

        let alFile = this._alFiles.geCurrLineRemoteALFile(document, range);
        let procedureName : string = ALFileCrawler.extractProcedureNameFromCurrLine();
        if (alFile && !ALFileCrawler.procedureExistsInALFile(alFile, procedureName)) {
                this._alWriter.targetALFileName = alFile.fileName;
                this._alWriter.targetALObjectName = alFile.alObject.objectName;
                this._alWriter.targetALProcedureName = procedureName;
                this._alWriter.targetALFilePath = alFile.filePath;
                let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub in " + alFile.alObject.objectName,  vscode.CodeActionKind.QuickFix);
                action.command = { 
                    command: this._addRemoteProcedureStub.name, title: 'Add Procedure Stub' 
                };
                actions.push(action);
        }

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
        
        return actions;
    }

   

    

}