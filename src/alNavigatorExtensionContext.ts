'use strict';

import * as vscode from 'vscode';

export class ALNavigatorExtensionContext implements vscode.Disposable {
    vscodeExtensionContext : vscode.ExtensionContext;

    constructor(context : vscode.ExtensionContext) {
        this.vscodeExtensionContext = context;
    }

    dispose() {
    }

}