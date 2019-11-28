import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALWriter } from '../al/alWriter';
import { ALFileCrawler } from '../al/alFileCrawler';
import { TextBuilder } from '../textBuilder';

export class ALAddLocalProcedureStubCodeCommand extends ALCodeCommand {
    private _alWriter : ALWriter;
    get alWriter(): ALWriter {
        return this._alWriter;
    }
    set alWriter(value : ALWriter){
        this._alWriter = value;
    }

    constructor(context : vscode.ExtensionContext, commandName: string, alWriter: ALWriter) {
        super(context, commandName);
        this._alWriter = alWriter;
    }
    
    protected async runAsync(range: vscode.Range) {
        this._alWriter.clearContent();
        this._alWriter.incIndent();

        let procedureStub: string = TextBuilder.buildProcedureStubText(true);
        this._alWriter.writeProcedureStub(procedureStub);  

        let lineNo = ALFileCrawler.findProcStubStartingLineNo();
        let source = this._alWriter.toString();

        let editor = vscode.window.activeTextEditor;
        await this._alWriter.insertContentAsync(source, lineNo, editor);
    }
}

