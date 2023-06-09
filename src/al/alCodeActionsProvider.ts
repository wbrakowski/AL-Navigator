import * as vscode from 'vscode';
import { ALFiles } from './alFiles';
import { ALFileCrawler } from './alFileCrawler';
import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { ALAddVarOrParamCodeCommand } from './alAddVarOrParamCodeCommand';
import { CommandType } from '../additional/commandType';
import { DiagnosticAnalyzer } from "../additional/diagnosticAnalyzer";

export class ALCodeActionsProvider implements vscode.CodeActionProvider {
    // protected _alFiles: ALFiles = new ALFiles();
    protected _alFiles: ALFiles;
    protected _addLocalVarCmd: ALAddVarOrParamCodeCommand;
    protected _addGlobalVarCmd: ALAddVarOrParamCodeCommand;
    protected _addParamCmd: ALAddVarOrParamCodeCommand;
    protected _context: vscode.ExtensionContext;

    public constructor(context: vscode.ExtensionContext, alFiles: ALFiles) {
        this._alFiles = alFiles;
        this._context = context;
        this._addLocalVarCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createLocalVar', this._alFiles, CommandType.LocalVariable);
        this._addGlobalVarCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createGlobalVar', this._alFiles, CommandType.GlobalVariable);
        this._addParamCmd = new ALAddVarOrParamCodeCommand(this._context, 'extension.createParam', this._alFiles, CommandType.Parameter);
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        if (!document) {
            return;
        }
        this._alFiles.document = document;
        let diagnostic = DiagnosticAnalyzer.getRelevantDiagnosticOfCurrentPosition(range, document);
        if (!diagnostic) {
            return;
        }

        let actions: vscode.CodeAction[] = [];
        let varName = ALFileCrawler.getRangeText(diagnostic.range);

        let createGlobalVarCodeAction = this.createVarCodeAction(document, diagnostic, varName, CommandType.GlobalVariable);
        let createLocalVarCodeAction = this.createVarCodeAction(document, diagnostic, varName, CommandType.LocalVariable);
        let createParamCodeAction = this.createVarCodeAction(document, diagnostic, varName, CommandType.Parameter);

        if (createLocalVarCodeAction) {
            actions.push(createLocalVarCodeAction);
        }
        if (createGlobalVarCodeAction) {
            actions.push(createGlobalVarCodeAction);
        }
        if (createParamCodeAction) {
            actions.push(createParamCodeAction);
        }
        if (actions) {
            return actions;
        }
        else {
            return;
        }
    }


    private createVarCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, varName: string, cmdType: CommandType): vscode.CodeAction | undefined {
        if (!diagnostic) {
            return;
        }
        let createVarCodeAction: vscode.CodeAction;
        let dCode = DiagnosticAnalyzer.getDiagnosticCode(diagnostic);
        switch (dCode) {
            case DiagnosticCodes.AL0118.toString():
                if (!ALFileCrawler.isProcedureCall(diagnostic.range)) {
                    let lineText = ALFileCrawler.getLineText(diagnostic.range);
                    if (cmdType === CommandType.GlobalVariable || !lineText.toUpperCase().includes('COLUMN') && !ALFileCrawler.isPageField(diagnostic.range)) {
                        createVarCodeAction = this.createVarCodeActionForLine(varName, cmdType, currentDocument, diagnostic);
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

    private createVarCodeActionForLine(varName: string, cmdType: CommandType, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction | undefined {
        // const action = new vscode.CodeAction('Add local var TEST', vscode.CodeActionKind.QuickFix);
        // action.command = {
        //     command: this._addLocalVarCmd.name,
        //     arguments: [vscode.CodeActionKind.QuickFix, diagnostic, document],
        //     title: 'just a title'
        // };
        // return action;
        let actionTitle: string = "";
        let action: vscode.CodeAction;
        switch (cmdType) {
            case CommandType.LocalVariable: {
                actionTitle = `Add local variable ${varName} (AL Navigator)`;
                action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
                this._addLocalVarCmd.varName = varName;
                this._addLocalVarCmd.document = document;
                action.command = { command: this._addLocalVarCmd.name, title: actionTitle };
                break;
            }
            case CommandType.GlobalVariable: {
                actionTitle = `Add global variable ${varName} (AL Navigator)`;
                action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
                this._addGlobalVarCmd.varName = varName;
                this._addGlobalVarCmd.document = document;
                action.command = { command: this._addGlobalVarCmd.name, title: actionTitle };
                break;
            }
            case CommandType.Parameter: {
                actionTitle = `Add parameter ${varName} (AL Navigator)`;
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