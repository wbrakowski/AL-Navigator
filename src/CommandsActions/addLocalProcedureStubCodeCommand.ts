import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALSyntaxWriter } from '../alSyntaxWriter';
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
        let writer: ALSyntaxWriter = new ALSyntaxWriter();
        
        writer.incIndent();
        let procedureStub: string = this._alFileOperations.buildProcedureStubText(true);

        writer.writeProcedureStub(procedureStub);  

        let lineNo = this._alFileOperations.procedureStubStartingLineNo();
        let source = writer.toString();

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

