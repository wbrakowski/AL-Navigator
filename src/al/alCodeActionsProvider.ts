import * as vscode from 'vscode';
import { ALFiles } from './alFiles';
import { ALFileCrawler } from './alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALAddVarCodeCommand } from './alAddVarCodeCommand';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles : ALFiles = new ALFiles();
    protected _addLocalVarCmd : ALAddVarCodeCommand;
    protected _addGlobalVarCmd : ALAddVarCodeCommand;
    protected _context: vscode.ExtensionContext;

    public constructor (context: vscode.ExtensionContext) {
        this._context = context;
        this._addLocalVarCmd = new ALAddVarCodeCommand(this._context, 'extension.createLocalVar', this._alFiles);
        this._addGlobalVarCmd = new ALAddVarCodeCommand(this._context, 'extension.createGlobalVar', this._alFiles);
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

        let varName = ALFileCrawler.getRangeText(diagnostic.range);

        let createGlobalVarCodeAction: vscode.CodeAction | undefined;
        createGlobalVarCodeAction = await this.createCodeAction(document, diagnostic, varName, false);
        let createLocalVarCodeAction: vscode.CodeAction | undefined;
        createLocalVarCodeAction = await this.createCodeAction(document, diagnostic, varName, true);

        let actions: vscode.CodeAction[] = [];
        if (createLocalVarCodeAction) {
            actions.push(createLocalVarCodeAction);
        }
        if (createGlobalVarCodeAction) {
            actions.push(createGlobalVarCodeAction);
        }
        return actions;
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, varName: string, local: boolean): Promise<vscode.CodeAction | undefined> {
        let createVarCodeAction: vscode.CodeAction | undefined;
        switch (diagnostic.code as string) {
            case DiagnosticCodes.AL0118.toString():
                if (!ALFileCrawler.isProcedureCall(diagnostic.range)) {
                    let lineText = ALFileCrawler.getLineText(diagnostic.range);
                    if (!local || !lineText.toUpperCase().includes('COLUMN')) {
                        createVarCodeAction = await this.createVarCodeActionForLine(varName, local, currentDocument, diagnostic.range);
                    }
                }
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

    private async createVarCodeActionForLine(varName: string, local: boolean, document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction> {
        let actionTitle: string = local ? `Add local variable ${varName}` : `Add global variable ${varName}`;
        let action: vscode.CodeAction = new vscode.CodeAction(actionTitle,  vscode.CodeActionKind.QuickFix);
        if (local) {
            this._addLocalVarCmd.local = true;
            this._addLocalVarCmd.varName = varName;
            this._addLocalVarCmd.document = document;
            action.command = { command: this._addLocalVarCmd.name, title: actionTitle };
        } 
        else {
            this._addGlobalVarCmd.local = false;
            this._addGlobalVarCmd.varName = varName;
            this._addGlobalVarCmd.document = document;
            action.command = { command: this._addGlobalVarCmd.name, title: actionTitle };
        }
        return action;
    }
}