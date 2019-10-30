import * as vscode from 'vscode';
import { ALFileOperations } from './alFileOperations';

export class ALSyntaxWriter {
    private content : string;
    private indentText : string;
    private indentPart : string;

    constructor() {
        this.content = "";
        this.indentText = "";
        this.indentPart = "    ";
    }

    public toString() : string {
        return this.content;
    }

    public incIndent() {
        this.indentText += this.indentPart;
    }

    public decIndent() {
        if (this.indentText.length > this.indentPart.length){
            this.indentText = this.indentText.substr(0, this.indentText.length - this.indentPart.length);
        }
        else {
            this.indentText = "";
        }
    }

    public setIndent(value : number) {
        let text : string = " ";
        this.indentText = text.repeat(value);
    }

    public writeLine(line : string) {
        this.content += (this.indentText + line + "\n");
    }

    public writeStartBlock() {
        this.writeLine("{");
        this.incIndent();
    }

    public writeProcedureStub(procedureStub: string) {
        this.writeLine(procedureStub);
        this.writeLine("begin");
        this.incIndent();
        this.writeLine("// TODO: Implement " + procedureStub);
        this.writeLine("Error('TODO')");
        this.decIndent();
        this.writeLine("end;");
    }
}