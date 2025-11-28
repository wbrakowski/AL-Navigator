'use strict';

import * as vscode from 'vscode';
import { commands } from 'vscode';
import { FileJumper } from './files/fileJumper';
import { CustomConsole } from './additional/console';
import * as Translator from './translation/translator';
import { ALFiles } from './al/alFiles';
import { ReportCreator } from './al/report/reportCreator';
import { variableRemover } from './al/report/variableRemover';
import * as LaunchJsonUpdater from './json/launchjson_updater';
import * as XlfUpdater from './xlf/xlf_updater';
import { ALCodeActionsProvider } from './al/codeActions/alCodeActionsProvider';
import { ReportRenameProvider } from './al/report/reportRenameProvider';
import { ReportFontFixer } from './report/reportFontFixer';
import { RdlExpressionFixer } from './report/rdlExpressionFixer';
const fieldHover = require('./additional/fieldHover');

export function activate(context: vscode.ExtensionContext) {
    // Initialize output console for logging
    CustomConsole.customConsole = vscode.window.createOutputChannel("AL Navigator");
    console.log('Congratulations, AL Navigator is ready to rumble!');

    const config = vscode.workspace.getConfiguration('alNavigator');

    // Register all commands
    const commandsToRegister = [
        { command: "extension.DataItem", callback: FileJumper.jumpToNextDataItem },
        { command: "extension.DataItemBottom", callback: FileJumper.jumpToNextDataItemFromBottom },
        { command: "extension.Keys", callback: FileJumper.jumpToKeys },
        { command: "extension.LastLocalVarLine", callback: FileJumper.jumpToLastLocalVarLine },
        { command: "extension.LastGlobalVarLine", callback: FileJumper.jumpToLastGlobalVarLine },
        { command: "extension.Actions", callback: FileJumper.jumpToNextActions },
        { command: "extension.ShowMSTranslation", callback: () => Translator.showMicrosoftTranslation(false) },
        { command: "extension.ShowMSTranslationReverse", callback: () => Translator.showMicrosoftTranslation(true) },
        {
            command: "extension.StartCreateReportDialog", callback: () => ReportCreator.startCreateReportDialog(new ALFiles()),
        },
        {
            command: "extension.RemoveUnusedVariablesFromReportDataset", callback: variableRemover.removeUnusedVariablesFromReportDataset,
        },
        {
            command: "extension.selectStartupObjectId",
            callback: LaunchJsonUpdater.selectStartupObjectId,
        },
        { command: "extension.insertTranslationFromComment", callback: XlfUpdater.insertTranslationFromComment },
        { command: "extension.TranslateAndCopyToClipboard", callback: () => Translator.translateAndCopyToClipboard(false) },
        {
            command: "extension.replaceReportFontFamiliesWithSegoeUI",
            callback: () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor found.');
                    return;
                }

                const document = editor.document;
                const fileExtension = document.fileName.toLowerCase();

                // Check if the file is an RDL or RDLC file
                if (!fileExtension.endsWith('.rdl') && !fileExtension.endsWith('.rdlc')) {
                    vscode.window.showWarningMessage('This command only works with .rdl or .rdlc files.');
                    return;
                }

                ReportFontFixer.findAndReplaceFonts(document);
            }
        },
        {
            command: "extension.replaceIrregularRdlExpressions",
            callback: () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor found.');
                    return;
                }

                const document = editor.document;
                const fileExtension = document.fileName.toLowerCase();

                // Check if the file is an RDL or RDLC file
                if (!fileExtension.endsWith('.rdl') && !fileExtension.endsWith('.rdlc')) {
                    vscode.window.showWarningMessage('This command only works with .rdl or .rdlc files.');
                    return;
                }

                RdlExpressionFixer.findAndReplaceExpressions(document);
            }
        },

        // Register new rename command to trigger ReportRenameProvider
        {
            command: "extension.renameALNavigator",
            callback: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor found.');
                    return;
                }

                const position = editor.selection.active;
                const document = editor.document;

                // Instantiate the ReportRenameProvider
                const reportRenameProvider = new ReportRenameProvider();

                try {
                    // Trigger the prepareRename functionality
                    const range = await reportRenameProvider.prepareRename(
                        document,
                        position,
                        new vscode.CancellationTokenSource().token
                    );

                    if (!range) {
                        // vscode.window.showErrorMessage('PrepareRename failed. Please make sure that your cursor is inside a column within a dataitem.');
                        return;
                    }

                    const oldName = document.getText(range);

                    // Prompt the user for a new name
                    const newName = await vscode.window.showInputBox({
                        prompt: `Rename '${oldName}' to:`,
                        validateInput: (input) =>
                            /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input) ? null : 'Invalid name format.',
                    });

                    if (!newName) {
                        // vscode.window.showInformationMessage('Rename canceled.');
                        return;
                    }

                    // Trigger the provideRenameEdits functionality
                    const workspaceEdit = await reportRenameProvider.provideRenameEdits(
                        document,
                        position,
                        newName,
                        new vscode.CancellationTokenSource().token
                    );

                    if (workspaceEdit) {
                        await vscode.workspace.applyEdit(workspaceEdit);
                        // vscode.window.showInformationMessage(
                        //     `Renamed '${oldName}' to '${newName}' successfully.`
                        // );
                    } else {
                        vscode.window.showErrorMessage('Failed to apply rename edits.');
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Rename failed: ${error.message}`);
                    console.error(error);
                }
            },
        }
    ];

    // Register commands dynamically
    commandsToRegister.forEach(({ command, callback }) =>
        context.subscriptions.push(commands.registerCommand(command, callback))
    );

    // Register Report Rename Provider
    // const selector: vscode.DocumentSelector = [
    //     { scheme: 'file', language: 'al' }
    // ];
    // context.subscriptions.push(
    //     vscode.languages.registerRenameProvider(selector, new ReportRenameProvider())
    // );

    // Register Code Actions Provider
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('al', new ALCodeActionsProvider(context, new ALFiles()), {
            providedCodeActionKinds: ALCodeActionsProvider.providedCodeActionKinds,
        })
    );

    // Register Hover Providers if enabled in settings
    if (config.get('enableHoverProviders')) {
        context.subscriptions.push(
            vscode.languages.registerHoverProvider('al', new fieldHover.FieldHoverProvider())
        );
    }
}

export function deactivate() { }
