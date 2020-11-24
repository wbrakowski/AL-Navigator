import * as vscode from 'vscode';
import { ALFiles } from './alFiles';
import { ALFileCrawler } from './alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALAddVarOrParamCodeCommand } from './alAddVarOrParamCodeCommand';
import { CommandType } from '../additional/commandType';

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    protected _alFiles: ALFiles = new ALFiles();
    protected _addLocalVarCmd: ALAddVarOrParamCodeCommand;
    protected _addGlobalVarCmd: ALAddVarOrParamCodeCommand;
    protected _addParamCmd: ALAddVarOrParamCodeCommand;
    protected _context: vscode.ExtensionContext;

    public constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._addLocalVarCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createLocalVar', this._alFiles, CommandType.LocalVariable);
        this._addGlobalVarCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createGlobalVar', this._alFiles, CommandType.GlobalVariable);
        this._addParamCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createParam', this._alFiles, CommandType.Parameter);
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
        createGlobalVarCodeAction = await this.createCodeAction(document, diagnostic, varName, CommandType.GlobalVariable);
        let createLocalVarCodeAction: vscode.CodeAction | undefined;
        createLocalVarCodeAction = await this.createCodeAction(document, diagnostic, varName, CommandType.LocalVariable);
        let createParamCodeAction: vscode.CodeAction | undefined;
        createParamCodeAction = await this.createCodeAction(document, diagnostic, varName, CommandType.Parameter);

        let actions: vscode.CodeAction[] = [];
        if (createLocalVarCodeAction) {
            actions.push(createLocalVarCodeAction);
        }
        if (createGlobalVarCodeAction) {
            actions.push(createGlobalVarCodeAction);
        }
        if (createParamCodeAction) {
            actions.push(createParamCodeAction);
        }
        return actions;
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, varName: string, cmdType: CommandType): Promise<vscode.CodeAction | undefined> {
        let createVarCodeAction: vscode.CodeAction | undefined;
        switch (diagnostic.code as string) {
            case DiagnosticCodes.AL0118.toString():
                if (!ALFileCrawler.isProcedureCall(diagnostic.range)) {
                    let lineText = ALFileCrawler.getLineText(diagnostic.range);
                    if (cmdType !== CommandType.LocalVariable || !lineText.toUpperCase().includes('COLUMN')) {
                        createVarCodeAction = await this.createVarCodeActionForLine(varName, cmdType, currentDocument, diagnostic.range);
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

    private async createVarCodeActionForLine(varName: string, cmdType: CommandType, document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction | undefined> {
        let actionTitle: string = "";
        let action: vscode.CodeAction | undefined;
        switch (cmdType) {
            case CommandType.LocalVariable: {
                actionTitle = `Add local variable ${varName}`;
                action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
                this._addLocalVarCmd.varName = varName;
                this._addLocalVarCmd.document = document;
                action.command = { command: this._addLocalVarCmd.name, title: actionTitle };
                break;
            }
            case CommandType.GlobalVariable: {
                actionTitle = `Add global variable ${varName}`;
                action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
                this._addGlobalVarCmd.varName = varName;
                this._addGlobalVarCmd.document = document;
                action.command = { command: this._addGlobalVarCmd.name, title: actionTitle };
                break;
            }
            case CommandType.Parameter: {
                actionTitle = `Add parameter ${varName}`;
                action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
                this._addParamCmd.varName = varName;
                this._addParamCmd.document = document;
                action.command = { command: this._addParamCmd.name, title: actionTitle };
                break;
            }
            default: {
                return;
            }
        }
        return action;
    }
}