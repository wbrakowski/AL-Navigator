// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';
import { FileJumper } from './fileJumper/fileJumper';
import { ALCodeActionsProvider } from './CommandsActions/alCodeActionsProvider';
//import { ALNavigatorExtensionContext } from './alNavigatorExtensionContext';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let jumpToNextdataItemCmd = commands.registerCommand("extension.DataItem", () => {
		FileJumper.jumpToNextDataItem();
	});

	let jumpToOnAfterGetRecCmd = commands.registerCommand("extension.OnAfterGetRecord", () => {
		FileJumper.jumpToNextOnAfterGetRecordTrigger();
	});

	let jumpToNextTriggerCommand = commands.registerCommand("extension.Trigger", () => {
		FileJumper.jumpToNextTrigger();
	  });

	let jumpToKeysCommand = commands.registerCommand("extension.Keys", () => {
		FileJumper.jumpToKeys();
	  });

	let jumpToActionsCommand = commands.registerCommand("extension.Actions", () => {
		FileJumper.jumpToNextActions();
	});
	let alCodeActionsProvider : ALCodeActionsProvider = new ALCodeActionsProvider(context);
	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('al', alCodeActionsProvider));
	
	context.subscriptions.push(jumpToNextdataItemCmd);
	context.subscriptions.push(jumpToOnAfterGetRecCmd);
	context.subscriptions.push(jumpToNextTriggerCommand);
	context.subscriptions.push(jumpToKeysCommand);
	context.subscriptions.push(jumpToActionsCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
