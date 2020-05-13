import * as vscode from 'vscode';
import { ALCodeCommand } from './alCodeCommand';
import { ALVariable } from './alVariable';
import { ALFileCrawler } from './alFileCrawler';
import { TextBuilder } from '../additional/textBuilder';
import { FileJumper } from '../filejumper/fileJumper';

export class ALAddVarCodeCommand extends ALCodeCommand {
    public _alVariable : ALVariable = new ALVariable('');
    public _document : vscode.TextDocument | undefined;
    public _jumpToCreatedVar: boolean = false;
    public _currentLineNo: number = 0;

    constructor(context : vscode.ExtensionContext, commandName:string) {
        super(context, commandName);
    }

    protected async runAsync(range: vscode.Range) {
        await this.insertVar(range);
    }
    
    protected async insertVar(range: vscode.Range) {
        // TODO Make this work
        if (!this._document) {
            return; 
        }
        let lineNo = this._alVariable.isLocal? ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1 : ALFileCrawler.findGlobalVarCreationPos();
        let varDeclaration = TextBuilder.buildVarDeclaration(range, this._alVariable.name, this._alVariable.objectType, this._alVariable.isLocal);
        let content: string = varDeclaration.declaration;
        content += '\n';
        let editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;

        if (!editor) {
            // TODO
            // Oops, something went wrong dude!
        }
        else {
            await editor.edit(editBuilder => {
                let pos = new vscode.Position(lineNo, 0);
                editBuilder.insert(pos, content);
                // lineNo -= 1;
                // lineNo += 1;#
                // this._alVariable.isLocal? FileJumper.jumpToLastLocalVarLine() : FileJumper.jumpToLastGlobalVarLine();
            }); 
            if (varDeclaration.createsVarSection) {
                lineNo += 1;
            }
            FileJumper.jumpToLine(lineNo, vscode.window.activeTextEditor);

        }
        // edit.insert(this._document.uri, position, content);

        // TODO
        //  if (jumpToCreatedVar) {
        //      vscode.commands.executeCommand('extension.LastLocalVarLine');
            
        //  }

    }

}
