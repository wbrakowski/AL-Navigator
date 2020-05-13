import * as vscode from 'vscode';
import { ALFiles } from './alFiles';
import { ALFileCrawler } from './alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALVariable } from './alVariable';
import { TextBuilder } from '../additional/textBuilder';
import { ALFile } from './alFile';
import { FileJumper } from '../filejumper/fileJumper';
import { ALAddVarCodeCommand } from './alAddVarCodeCommand';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();
    protected _addLocalVarCmd : ALAddVarCodeCommand;
    protected _addGlobalVarCmd : ALAddVarCodeCommand;
    protected context: vscode.ExtensionContext;

    public constructor (context: vscode.ExtensionContext) {
        this.context = context;
        this._addLocalVarCmd = new ALAddVarCodeCommand(this.context, 'extension.createLocalVar');
        this._addGlobalVarCmd = new ALAddVarCodeCommand(this.context, 'extension.createGlobalVar');
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        if (!document) {
            return;
        }
        this._alFiles.document = document;
        let diagnostic = this._alFiles.getRelevantDiagnosticOfCurrentPosition(range);
        if (!diagnostic) {
            return;
        }

        let localVarToCreate = await this.createVarDeclaration(document, diagnostic);
        if (!localVarToCreate) {
            return;
        }

        let jumpToCreatedVar: boolean = !localVarToCreate.objectType;

        let globalVarToCreate: ALVariable = new ALVariable('');
        Object.assign(globalVarToCreate, localVarToCreate);
        if (globalVarToCreate) {
            globalVarToCreate.isLocal = false;
        }

        let createLocalVarCodeAction: vscode.CodeAction | undefined;
        createLocalVarCodeAction = await this.createCodeAction(document, diagnostic, localVarToCreate, jumpToCreatedVar);

        let createGlobalVarCodeAction: vscode.CodeAction | undefined;
        createGlobalVarCodeAction = await this.createCodeAction(document, diagnostic, globalVarToCreate, jumpToCreatedVar);

        if (!createLocalVarCodeAction && !createGlobalVarCodeAction) {
            return;
        }

        let actions: vscode.CodeAction[] = [];
        if (createLocalVarCodeAction) {
            actions.push(createLocalVarCodeAction);
        }
        if (createGlobalVarCodeAction) {
            actions.push(createGlobalVarCodeAction);
        }
        return actions;
    }

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

    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, varToCreate: ALVariable, jumpToCreatedVar: boolean): Promise<vscode.CodeAction | undefined> {
        let createVarCodeAction: vscode.CodeAction | undefined;
        switch (diagnostic.code as string) {
            case DiagnosticCodes.AL0118.toString():
                createVarCodeAction = await this.createVarCodeActionForLine(varToCreate, currentDocument, diagnostic.range, jumpToCreatedVar, diagnostic.range.start.line);
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

    private async createVarCodeActionForLine(alVariable: ALVariable, document: vscode.TextDocument, range: vscode.Range, jumpToCreatedVar: boolean, currentLineNo?: number): Promise<vscode.CodeAction> {
        // TODO Make this work
        let actionTitle : string = alVariable.isLocal? `Add local variable ${alVariable.name}` : `Add global variable ${alVariable.name}`;
        let action : vscode.CodeAction = new vscode.CodeAction(actionTitle,  vscode.CodeActionKind.QuickFix);
        if (alVariable.isLocal) {
            this._addLocalVarCmd._alVariable = alVariable;
            this._addLocalVarCmd._currentLineNo = currentLineNo? currentLineNo : 0;
            this._addLocalVarCmd._document = document;
            this._addLocalVarCmd._jumpToCreatedVar = jumpToCreatedVar;
            action.command = { command: this._addLocalVarCmd.name, title: actionTitle };
        } 
        else {
            this._addGlobalVarCmd._alVariable = alVariable;
            this._addGlobalVarCmd._currentLineNo = currentLineNo? currentLineNo : 0;
            this._addGlobalVarCmd._document = document;
            this._addGlobalVarCmd._jumpToCreatedVar = jumpToCreatedVar;
            action.command = { command: this._addGlobalVarCmd.name, title: actionTitle };
        }
        return action;
    }
}