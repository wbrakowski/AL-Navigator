// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import { commands } from 'vscode';
import { FileJumper } from './additional/fileJumper';
import { ALCodeActionsProvider } from './al/alCodeActionsProvider';
import { CustomConsole } from './additional/console';
import * as Translator from './additional/translator';
import { ALFiles } from './al/alFiles';
import { ReportCreator } from './al/reportCreator';
const fieldHover = require('./additional/fieldHover');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	CustomConsole.customConsole = vscode.window.createOutputChannel("AL Navigator");
	console.log('Congratulations, AL Navigator is ready to rumble!');
	const config = vscode.workspace.getConfiguration('alNavigator');	

	let jumpToNextDataItemCmd = commands.registerCommand("extension.DataItem", () => {
		FileJumper.jumpToNextDataItem();
	});

	let jumpToNextDataItemBottomCmd = commands.registerCommand("extension.DataItemBottom", () => {
		FileJumper.jumpToNextDataItemFromBottom();
	});

	let jumpToKeysCmd = commands.registerCommand("extension.Keys", () => {
		FileJumper.jumpToKeys();
	});

	let jumpToLastLocalVarLineCmd = commands.registerCommand("extension.LastLocalVarLine", () => {
		FileJumper.jumpToLastLocalVarLine();
	});

	let jumpToLastGlobalVarLineCmd = commands.registerCommand("extension.LastGlobalVarLine", () => {
		FileJumper.jumpToLastGlobalVarLine();
	});

	let jumpToActionsCmd = commands.registerCommand("extension.Actions", () => {
		FileJumper.jumpToNextActions();
	});

	let openMSTranslationCmd = commands.registerCommand("extension.OpenMSTranslation", () => {
		Translator.openMicrosoftTranslation(false);
	});

	let openMSTranslationReverseCmd = commands.registerCommand("extension.OpenMSTranslationReverse", () => {
		Translator.openMicrosoftTranslation(true);
	});

	let showMSTranslationCmd = commands.registerCommand("extension.ShowMSTranslation", () => {
		Translator.showMicrosoftTranslation(false);
	});

	let showMSTranslationReverseCmd = commands.registerCommand("extension.ShowMSTranslationReverse", () => {
		Translator.showMicrosoftTranslation(true);
	});


	let _alFiles: ALFiles = new ALFiles();
	let startCreateReportDialogCmd = commands.registerCommand("extension.StartCreateReportDialog", () => {
		ReportCreator.startCreateReportDialog(_alFiles);
	});


	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('al', new ALCodeActionsProvider(context, _alFiles), {
		providedCodeActionKinds: ALCodeActionsProvider.providedCodeActionKinds
	}));

	// if(config.get('enableHoverProviders'))
    //     context.subscriptions.push(vscode.languages.registerHoverProvider(
    //         'al', new fieldHover.FieldHoverProvider()
    //     ));

	context.subscriptions.push(jumpToNextDataItemCmd);
	context.subscriptions.push(jumpToNextDataItemBottomCmd);
	context.subscriptions.push(jumpToKeysCmd);
	context.subscriptions.push(jumpToLastLocalVarLineCmd);
	context.subscriptions.push(jumpToLastGlobalVarLineCmd);
	context.subscriptions.push(jumpToActionsCmd);
	context.subscriptions.push(openMSTranslationCmd);
	context.subscriptions.push(openMSTranslationReverseCmd);
	context.subscriptions.push(showMSTranslationCmd);
	context.subscriptions.push(showMSTranslationReverseCmd);
	context.subscriptions.push(startCreateReportDialogCmd);
}

// this method is called when your extension is deactivated
export function deactivate() { }
