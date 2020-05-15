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
        if (!this._document) {
            return; 
        }
        let lineNo: number;
        if (this._alVariable.isLocal) {
            lineNo = ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1;
        }
        else {
            lineNo = ALFileCrawler.findGlobalVarSectionEndLineNo();
            if (lineNo === -1) {
                lineNo = ALFileCrawler.findGlobalVarCreationPos();
            }
        }
        
        if (!this._alVariable.objectType) {
            let varTypes: string[] = this._alVariable.getVariableTypeList();

            // Ask for type
            let selectedType = await vscode.window.showQuickPick(varTypes, {
                canPickMany: false,
                placeHolder: 'Select variable type'
            });
            if (selectedType) {
                this._alVariable.objectType = selectedType;
                switch (selectedType) {
                    case "Label": {
                        // Define Label value
                        let selectedValue = await vscode.window.showInputBox({ placeHolder: `Type value for ${selectedType}` });
                        if (selectedValue) {
                            this._alVariable.isLabel = true;
                            this._alVariable.labelValue = selectedValue;
                        }
                    }
                }
            }
        }

        let varDeclaration = TextBuilder.buildVarDeclaration(range, this._alVariable);
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
