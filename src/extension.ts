// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';
import { FileJumper } from './additional/fileJumper';
import { ALCodeActionsProvider } from './al/alCodeActionsProvider';
import { CustomConsole } from './additional/console';
import { TranslationService } from './additional/translationService';
import * as Translator from './additional/translator';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	CustomConsole.customConsole = vscode.window.createOutputChannel("AL Navigator");
	console.log('Congratulations, AL Navigator is ready to rumble!');

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

	let jumpToLastGlobalVarLinecmd = commands.registerCommand("extension.LastGlobalVarLine", () => {
		FileJumper.jumpToLastGlobalVarLine();
	});

	let jumpToActionsCmd = commands.registerCommand("extension.Actions", () => {
		FileJumper.jumpToNextActions();
	});

	let openMSTranslation = commands.registerCommand("extension.OpenMSTranslation", () => {
		Translator.openMicrosoftTranslation(false);
	});

	let openMSTranslationReverse = commands.registerCommand("extension.OpenMSTranslationReverse", () => {
		Translator.openMicrosoftTranslation(true);
	});

	let showMSTranslation = commands.registerCommand("extension.ShowMSTranslation", () => {
		Translator.showMicrosoftTranslation(false);
	});

	let showMSTranslationReverse = commands.registerCommand("extension.ShowMSTranslationReverse", () => {
		Translator.showMicrosoftTranslation(true);
	});


	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('al', new ALCodeActionsProvider(context), {
		providedCodeActionKinds: ALCodeActionsProvider.providedCodeActionKinds
	}));

	context.subscriptions.push(jumpToNextDataItemCmd);
	context.subscriptions.push(jumpToNextDataItemBottomCmd);
	context.subscriptions.push(jumpToKeysCmd);
	context.subscriptions.push(jumpToLastLocalVarLineCmd);
	context.subscriptions.push(jumpToLastGlobalVarLinecmd);
	context.subscriptions.push(jumpToActionsCmd);
	context.subscriptions.push(openMSTranslation);
	context.subscriptions.push(openMSTranslationReverse);
	context.subscriptions.push(showMSTranslation);
	context.subscriptions.push(showMSTranslationReverse);
}

// this method is called when your extension is deactivated
export function deactivate() { }
