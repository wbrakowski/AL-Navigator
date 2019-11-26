import * as vscode from 'vscode';
import { ALAddRemoteProcedureStubCodeCommand } from './addRemoteProcedureStubCodeCommand';
import { ALAddLocalProcedureStubCodeCommand } from './addLocalProcedureStubCodeCommand';
import { AddLocalVariableCodeCommand } from './addLocalVariableCodeCommand';
import { ALFiles } from '../alFiles';
import { VariableCreator} from '../variablecreator/variableCreator';
import { ALWriter } from '../alWriter';
import { ALFileCrawler } from '../alFileCrawler';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();
    protected _alWriter : ALWriter = new ALWriter();
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;
    protected _addRemoteProcedureStub : ALAddRemoteProcedureStubCodeCommand;
    protected _addLocalProcedureStub : ALAddLocalProcedureStubCodeCommand;
    protected _addLocalVariable : AddLocalVariableCodeCommand;


    constructor(context: vscode.ExtensionContext) {
        this._alNavigatorExtensionContext = context;
        this._addRemoteProcedureStub = new ALAddRemoteProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addRemoteProcedureStubCommand", this._alFiles, this._alWriter);
        this._addLocalProcedureStub = new ALAddLocalProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addLocalProcedureStubCommand", this._alFiles, this._alWriter);
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
        else if (this._alFiles.RemoteProcCanBeCreated(document, range)) {
            if (this._alFiles.currentRemoteALFile) {
                this._alWriter.targetALFileName = this._alFiles.currentRemoteALFile.fileName;
                this._alWriter.targetALObjectName = this._alFiles.currentRemoteALFile.objectName;
                this._alWriter.targetALProcedureName = this._alFiles.currentSelectionProcedureName;
                this._alWriter.targetALFilePath = this._alFiles.currentRemoteALFile.filePath;
            }
            
            let action : vscode.CodeAction = new vscode.CodeAction("Add Procedure Stub in " + this._alWriter.targetALObjectName,  vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addRemoteProcedureStub.name, title: 'Add Procedure Stub' 
            };
            actions.push(action);
        }

        // TODO

        let currentLineText = this._alFiles.getCurrentLineTextFromRange(document, range);
        let currLineDetectedVars = ALFileCrawler.extractVars(currentLineText);
        let localVarsAndParams = ALFileCrawler.extractLocalVarsAndParams();

        function containsAllElements(arr: string[], arr2: string[]): boolean {
            return arr.every(i => arr2.includes(i));
        }

        let allVarsDeclared: boolean = containsAllElements(currLineDetectedVars, localVarsAndParams);
        let varNameToDeclare: string = "";
        if (!allVarsDeclared) {
            for(let i = 0; i< currLineDetectedVars.length; i++) {
                let detVarIndex = localVarsAndParams.indexOf(currLineDetectedVars[i]);
                if (detVarIndex < 0) {
                    varNameToDeclare = currLineDetectedVars[i];
                    break;
                }
            }
        }

        if (varNameToDeclare) {
            if (!this._addLocalVariable.varCreator.wsVarsAdded) {
                this._addLocalVariable.varCreator.addALVarsFromWorkSpace();
            }
        }

        if ((varNameToDeclare) && (this._addLocalVariable.varCreator.variableNameExists(varNameToDeclare))) {
            this._addLocalVariable.clearVarsToDeclare();
            this._addLocalVariable.localVarNameToDeclare = varNameToDeclare;
            this._addLocalVariable.localVarTypeToDeclare = this._addLocalVariable.varCreator.getObjectTypeAndNameFromVarName(varNameToDeclare);
            let action : vscode.CodeAction = new vscode.CodeAction("Add local variable " + varNameToDeclare,  vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addLocalVariable.name, title: 'Add local variable' 
            };
            actions.push(action);
        }
        
        return actions;
    }

   

    

}