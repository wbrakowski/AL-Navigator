// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';
import { ReportJumper } from './reportJumper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	let dataItemCommand = commands.registerCommand("extension.DataItem", () => {
	  ReportJumper.jumpToNextDataItem();
	});

	let onAfterGetRecCommand = commands.registerCommand("extension.OnAfterGetRecord", () => {
	  ReportJumper.jumpToNextOnAfterGetRecordTrigger();
	});


	context.subscriptions.push(dataItemCommand);
	context.subscriptions.push(onAfterGetRecCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
