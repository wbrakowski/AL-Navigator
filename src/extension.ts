// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';
import { FileJumper } from './additional/fileJumper';
import { ALCodeActionsProvider } from './al/alCodeActionsProvider';
import { CustomConsole } from './additional/console';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	CustomConsole.customConsole = vscode.window.createOutputChannel("AL Navigator");
	console.log('Congratulations, AL Navigator is ready to rumble!');

	let jumpToNextdataItemCmd = commands.registerCommand("extension.DataItem", () => {
		FileJumper.jumpToNextDataItem();
	});

	let jumpToOnAfterGetRecCmd = commands.registerCommand("extension.OnAfterGetRecord", () => {
		FileJumper.jumpToNextOnAfterGetRecordTrigger();
	});

	let jumpToNextTriggerCmd = commands.registerCommand("extension.Trigger", () => {
		FileJumper.jumpToNextTrigger();
	  });

	let jumpToKeysCmd = commands.registerCommand("extension.Keys", () => {
		FileJumper.jumpToKeys();
	  });

	  let jumpToModifyCmd = commands.registerCommand("extension.OnModify", () => {
		FileJumper.jumpToNextOnModifyTrigger();
	  });

	  let jumpToDeleteCmd = commands.registerCommand("extension.OnDelete", () => {
		FileJumper.jumpToNextOnDeleteTrigger();
	  });

	  let jumpToInsertCmd = commands.registerCommand("extension.OnInsert", () => {
		FileJumper.jumpToNextOnInsertTrigger();
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
	
	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('al', new ALCodeActionsProvider(context), {
		providedCodeActionKinds: ALCodeActionsProvider.providedCodeActionKinds
	}));
	
	context.subscriptions.push(jumpToNextdataItemCmd);
	context.subscriptions.push(jumpToOnAfterGetRecCmd);
	context.subscriptions.push(jumpToNextTriggerCmd);
	context.subscriptions.push(jumpToKeysCmd);
	context.subscriptions.push(jumpToLastLocalVarLineCmd);
	context.subscriptions.push(jumpToLastGlobalVarLinecmd);
	context.subscriptions.push(jumpToActionsCmd);
	context.subscriptions.push(jumpToInsertCmd);
	context.subscriptions.push(jumpToDeleteCmd);
	context.subscriptions.push(jumpToModifyCmd);

}

// this method is called when your extension is deactivated
export function deactivate() {}
