import * as vscode from 'vscode';
import { ALAddRemoteProcedureStubCodeCommand } from './addRemoteProcedureStubCodeCommand';
import { ALAddLocalProcedureStubCodeCommand } from './addLocalProcedureStubCodeCommand';
import { AddLocalVariableCodeCommand } from './addLocalVariableCodeCommand';
import { ALFileOperations } from '../alFileOperations';
import { VariableCreator} from '../VariableCreator/variableCreator';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;
    protected _addRemoteProcedureStub : ALAddRemoteProcedureStubCodeCommand;
    protected _addLocalProcedureStub : ALAddLocalProcedureStubCodeCommand;
    protected _addLocalVariable : AddLocalVariableCodeCommand;

    constructor(context: vscode.ExtensionContext) {
        let alFileOperations : ALFileOperations = new ALFileOperations();
        let varCreator : VariableCreator = new VariableCreator();

        this._alNavigatorExtensionContext = context;
        this._addRemoteProcedureStub = new ALAddRemoteProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addRemoteProcedureStubCommand", alFileOperations);
        this._addLocalProcedureStub = new ALAddLocalProcedureStubCodeCommand(this._alNavigatorExtensionContext, "addLocalProcedureStubCommand", alFileOperations);
        this._addLocalVariable = new AddLocalVariableCodeCommand(this._alNavigatorExtensionContext, "addLocalVariableCommand", alFileOperations, varCreator);
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

        let currentLineText = this._addLocalVariable.alFileOperations.getCurrentLineTextFromRange(document, range);
        let currLineDetectedVars = this._addLocalVariable.alFileOperations.detectCurrentLineVariables(currentLineText);
        let localVarsAndParams = this._addLocalVariable.alFileOperations.getCurrLineLocalVarsAndParams(document, range, currentLineText);

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

        if ((varNameToDeclare) && (this._addLocalVariable.varCreator.variableNameExists(varNameToDeclare))) {
            this._addLocalVariable.clearVarsToDeclare();
            this._addLocalVariable.localVarNameToDeclare = varNameToDeclare;
            this._addLocalVariable.localVarTypeToDeclare = this._addLocalVariable.varCreator.getObjectTypeAndNameFromVarName(varNameToDeclare);
            //this._addLocalVariable.localVarTypeToDeclare = this._addLocalVariable.alFileOperations.findTypeForName(varNameToDeclare);
            let action : vscode.CodeAction = new vscode.CodeAction("Add local variable " + varNameToDeclare,  vscode.CodeActionKind.QuickFix);
            action.command = { 
                command: this._addLocalVariable.name, title: 'Add local variable' 
            };
            actions.push(action);
        }
        
        return actions;
    }

   

    

}