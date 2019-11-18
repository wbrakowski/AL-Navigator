import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFileOperations} from '../alFileOperations';

export class ALAddLocalProcedureStubCodeCommand extends ALCodeCommand {
    private _alFileOperations : ALFileOperations;
    get alFileOperations(): ALFileOperations {
        return this._alFileOperations;
    }
    set alFileOperations(value : ALFileOperations){
        this._alFileOperations = value;
    }

    constructor(context : vscode.ExtensionContext, commandName: string, alFileOperations: ALFileOperations) {
        super(context, commandName);
        this._alFileOperations = alFileOperations;
    }
    
    protected async runAsync(range: vscode.Range) {
        this._alFileOperations.clearContent();

        this.alFileOperations.incIndent();
        let procedureStub: string = this._alFileOperations.buildProcedureStubText(true);

        this.alFileOperations.writeProcedureStub(procedureStub);  

        let lineNo = this._alFileOperations.procedureStubStartingLineNo();
        let source = this.alFileOperations.toString();

        let editor = vscode.window.activeTextEditor;
        await this.insertContentAsync(source, lineNo, editor);
    }

    protected async insertContentAsync(content: string, lineNo: number, editor : vscode.TextEditor | undefined) {
        content = '\n' + content; 

        if (!editor) {
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(lineNo, 0), content);
        });
    }

}

