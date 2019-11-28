import * as vscode from 'vscode';
import * as fs from 'fs';
import { Position, TextEditor } from 'vscode';

export class ALWriter {
    private indentText : string;
    private indentPart : string;
    public content : string;
    public targetALFileName: string = "";
    public targetALObjectName: string = "";
    public targetALProcedureName: string = "";
    public targetALFilePath: string = "";

    constructor() {
        this.content = "";
        this.indentText = "";
        this.indentPart = "    ";
    }

    async insertContentAsync(content: string, lineNo: number, editor : TextEditor | undefined) {
        content += '\n'; 
        if (!editor) {
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(new Position(lineNo, 0), content);
        });
    }

    writeStubInFile(stub: string): void {
        let fileText : string = fs.readFileSync(this.targetALFilePath, 'utf-8');
        let lastIndexClosingBracket = fileText.lastIndexOf("}");
        if (lastIndexClosingBracket === -1) {
            console.error("The file seems to be not properly built. Could not find closing bracket.");
        }
        else {
            let textBeforeLastBracket : string = fileText.substring(0, lastIndexClosingBracket);
            let textAfterLastBracket : string = fileText.substring(lastIndexClosingBracket + 1);
            let fileTextWithStub : string = textBeforeLastBracket + "\n" + "   " + stub + "\n" + "}";
            if (textAfterLastBracket) {
                fileTextWithStub += textAfterLastBracket;
            }
            fs.writeFileSync(this.targetALFilePath, fileTextWithStub, 'utf-8');
            //this._alFiles.repopulateALFIlesArray();
            console.log('Stub added.');
        }
        
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

        public writeLine(line : string) {
            this.content += (this.indentText + line + "\n");
        }

        public writeProcedureStub(procedureStub: string) {
            this.writeLine(procedureStub);
        }

        public clearContent() {
            this.content = "";
            this.indentText = "";
            this.indentPart = "    ";
        }

    
}