'use strict';

import * as vscode from 'vscode';
import { commands } from 'vscode';
import { FileJumper } from './files/fileJumper';
import { CustomConsole } from './additional/console';
import * as Translator from './translation/translator';
import { ALFiles } from './al/alFiles';
import { ReportCreator } from './al/report/reportCreator';
import * as LaunchJsonUpdater from './json/launchjson_updater';
import * as XlfUpdater from './xlf/xlf_updater';
import { ALCodeActionsProvider } from './al/codeActions/alCodeActionsProvider';
import { ReportRenameProvider } from './al/report/reportRenameProvider';
import { ReportAnalyzer } from './report/reportAnalyzer';
import { QuickLaunchStatusBar } from './json/quickLaunchStatusBar';
import { TelemetryService, trackCommandExecution } from './telemetry/telemetryService';
const fieldHover = require('./additional/fieldHover');

export function activate(context: vscode.ExtensionContext) {
    // Initialize output console for logging
    CustomConsole.customConsole = vscode.window.createOutputChannel("AL Navigator");
    console.log('Congratulations, AL Navigator is ready to rumble!');

    // Initialize Telemetry Service
    const telemetry = TelemetryService.getInstance();
    telemetry.initialize(context);

    const config = vscode.workspace.getConfiguration('alNavigator');

    // Initialize Recently Used Objects Manager
    LaunchJsonUpdater.initializeRecentlyUsedManager(context);

    // Create and show Quick Launch Status Bar
    const quickLaunchStatusBar = new QuickLaunchStatusBar();
    context.subscriptions.push(quickLaunchStatusBar);

    // Register all commands
    const commandsToRegister = [
        { command: "extension.DataItem", callback: trackCommandExecution("extension.DataItem", FileJumper.jumpToNextDataItem) },
        { command: "extension.DataItemBottom", callback: trackCommandExecution("extension.DataItemBottom", FileJumper.jumpToNextDataItemFromBottom) },
        { command: "extension.Keys", callback: trackCommandExecution("extension.Keys", FileJumper.jumpToKeys) },
        { command: "extension.LastLocalVarLine", callback: trackCommandExecution("extension.LastLocalVarLine", FileJumper.jumpToLastLocalVarLine) },
        { command: "extension.LastGlobalVarLine", callback: trackCommandExecution("extension.LastGlobalVarLine", FileJumper.jumpToLastGlobalVarLine) },
        { command: "extension.Actions", callback: trackCommandExecution("extension.Actions", FileJumper.jumpToNextActions) },
        { command: "extension.ShowMSTranslation", callback: trackCommandExecution("extension.ShowMSTranslation", async () => await Translator.showMicrosoftTranslation(false)) },
        { command: "extension.ShowMSTranslationReverse", callback: trackCommandExecution("extension.ShowMSTranslationReverse", async () => await Translator.showMicrosoftTranslation(true)) },
        {
            command: "extension.StartCreateReportDialog", callback: trackCommandExecution("extension.StartCreateReportDialog", async () => await ReportCreator.startCreateReportDialog(new ALFiles())),
        },
        {
            command: "extension.analyzeReport",
            callback: trackCommandExecution("extension.analyzeReport", async () => await ReportAnalyzer.analyzeReport()),
        },
        {
            command: "extension.selectStartupObjectId",
            callback: trackCommandExecution("extension.selectStartupObjectId", async () => {
                await LaunchJsonUpdater.selectStartupObjectId();
                // Update status bar after switching
                quickLaunchStatusBar.updateStatusBarText();
            }),
        },
        {
            command: "extension.clearObjectCache",
            callback: trackCommandExecution("extension.clearObjectCache", async () => await LaunchJsonUpdater.clearObjectCache()),
        },
        { command: "extension.insertTranslationFromComment", callback: trackCommandExecution("extension.insertTranslationFromComment", async () => await XlfUpdater.insertTranslationFromComment()) },
        { command: "extension.TranslateAndCopyToClipboard", callback: trackCommandExecution("extension.TranslateAndCopyToClipboard", async () => await Translator.translateAndCopyToClipboard(false)) },

        // Register new rename command to trigger ReportRenameProvider
        {
            command: "extension.renameALNavigator",
            callback: trackCommandExecution("extension.renameALNavigator", async () => {
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
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Rename failed: ${error.message}`);
                    console.error(error);
                }
            }),
        },
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

export function deactivate() {
    // Dispose telemetry service and flush pending data
    const telemetry = TelemetryService.getInstance();
    telemetry.dispose();
}
