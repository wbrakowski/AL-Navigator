import { Position, TextEditor } from 'vscode';

export class ALWriter {
    private indentText : string;
    private indentPart : string;
    public content : string;

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

        public clearContent() {
            this.content = "";
            this.indentText = "";
            this.indentPart = "    ";
        }

    
}