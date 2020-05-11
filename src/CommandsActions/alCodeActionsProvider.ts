import * as vscode from 'vscode';
import { ALFiles } from '../al/alFiles';
import { ALFileCrawler } from '../al/alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALVariable } from '../al/alVariable';
import { TextBuilder } from '../additional/textBuilder';
import { ALFile } from '../al/alFile';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();

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

        let globalVarToCreate: ALVariable = new ALVariable('');
        Object.assign(globalVarToCreate, localVarToCreate);
        if (globalVarToCreate) {
            globalVarToCreate.isLocal = false;
        }
        

        let createLocalVarCodeAction: vscode.CodeAction | undefined;
        createLocalVarCodeAction = await this.createCodeAction(document, diagnostic, localVarToCreate);

        let createGlobalVarCodeAction: vscode.CodeAction | undefined;
        createGlobalVarCodeAction = await this.createCodeAction(document, diagnostic, globalVarToCreate);

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
        let actionTitle : string = alVariable.isLocal? `Add local variable ${alVariable.name}` : `Add global variable ${alVariable.name}`;
        let action : vscode.CodeAction = new vscode.CodeAction(actionTitle,  vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();

        let lineNo = alVariable.isLocal? ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1 : ALFileCrawler.findGlobalVarCreationPos();
        let position: vscode.Position = new vscode.Position(lineNo, 0);
        let content = TextBuilder.buildVarDeclaration(range, alVariable.name, alVariable.objectType, alVariable.isLocal);
        content += '\n';
        action.edit.insert(document.uri, position, content);

        return action;
    }
}