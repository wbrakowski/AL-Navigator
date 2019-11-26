import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFiles} from '../alFiles';
import { ALWriter } from '../alWriter';

export class ALAddLocalProcedureStubCodeCommand extends ALCodeCommand {
    private _alFiles : ALFiles;
    get alFiles(): ALFiles {
        return this._alFiles;
    }
    set alFiles(value : ALFiles){
        this._alFiles = value;
    }

    private _alWriter : ALWriter;
    get alWriter(): ALWriter {
        return this._alWriter;
    }
    set alWriter(value : ALWriter){
        this._alWriter = value;
    }

    constructor(context : vscode.ExtensionContext, commandName: string, alFiles: ALFiles, alWriter: ALWriter) {
        super(context, commandName);
        this._alFiles = alFiles;
        this._alWriter = alWriter;
    }
    
    protected async runAsync(range: vscode.Range) {
        this._alFiles.clearContent();

        this._alFiles.incIndent();
        let procedureStub: string = this._alFiles.buildProcedureStubText(true);

        this._alFiles.writeProcedureStub(procedureStub);  

        let lineNo = this._alFiles.procedureStubStartingLineNo();
        let source = this._alFiles.toString();

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

