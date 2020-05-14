import * as vscode from 'vscode';
import { ALCodeCommand } from './alCodeCommand';
import { ALVariable } from './alVariable';
import { ALFileCrawler } from './alFileCrawler';
import { TextBuilder } from '../additional/textBuilder';
import { FileJumper } from '../filejumper/fileJumper';
import { stringify } from 'querystring';


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
        if (!this._document) {
            return; 
        }
        let lineNo = this._alVariable.isLocal? ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1 : ALFileCrawler.findGlobalVarCreationPos();
        
        if (!this._alVariable.objectType) {
            let varTypes: string[] = this._alVariable.getVariableTypeList();
            //ask for fields
            let selectedType = await vscode.window.showQuickPick(varTypes, {
                canPickMany: false,
                placeHolder: 'Select variable type'
            });
            if (selectedType) {
                this._alVariable.objectType = selectedType;
            }
        }

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
            }); 
            if (varDeclaration.createsVarSection) {
                lineNo += 1;
            }
            if (!this._alVariable.objectType) {
                FileJumper.jumpToLine(lineNo, vscode.window.activeTextEditor);
            }
        }
    }

}
