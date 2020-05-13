// TODO: Delete this?

import * as vscode from 'vscode';

export class ALCodeCommand {    
    protected _alNavigatorExtensionContext : vscode.ExtensionContext;  

    public name: string;

    constructor(context : vscode.ExtensionContext, commandName: string) {
        this._alNavigatorExtensionContext = context;
        this.name = commandName;
        this._alNavigatorExtensionContext.subscriptions.push(
            vscode.commands.registerCommand(
                commandName,
                () => this.run()
            ));        
    }

    protected run() {
        if (!vscode.window.activeTextEditor) {
            return;
        }

        let position = vscode.window.activeTextEditor.selection.active;
        let range = new vscode.Range(position, position);
        this.runAsync(range);        
    }

    protected async runAsync(range: vscode.Range) {
    }
} 