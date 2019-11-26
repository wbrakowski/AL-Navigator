import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFiles} from '../alFiles';
import { VariableCreator } from '../variablecreator/variableCreator';
import { ALWriter } from '../alWriter';
import { ALFileCrawler } from '../alFileCrawler';

export class AddLocalVariableCodeCommand extends ALCodeCommand {
    public localVarNameToDeclare: string;
    public localVarTypeToDeclare: string;
    private _alFiles : ALFiles;
    get alFiles(): ALFiles {
        return this._alFiles;
    }
    set alFiles(value : ALFiles){
        this._alFiles = value;
    }
    private _varCreator: VariableCreator;
    get varCreator(): VariableCreator {
        return this._varCreator;
    }
    set varCreator(value : VariableCreator){
        this._varCreator = value;
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
        this._varCreator = new VariableCreator(alFiles, alWriter);
        this.localVarNameToDeclare = "";
        this.localVarTypeToDeclare = "";
    }

    public clearVarsToDeclare(): void {
        this.localVarNameToDeclare = "";
        this.localVarTypeToDeclare = "";
    }
    
    protected async runAsync(range: vscode.Range) {
        let source: string = "";
        this._alFiles.clearContent();

        let localVarStartLineNo = ALFileCrawler.findLocalVarSectionStartLineNo();
        if (localVarStartLineNo === -1) {
            localVarStartLineNo = this._alFiles.findLocalProcedureStartLineNo(range);
            if (localVarStartLineNo > -1) {
                source = "    " + "var" + "\n";
            }
        }

        let localVarEndLineNo = ALFileCrawler.findLocalVarSectionEndLineNo(localVarStartLineNo);

        if (localVarEndLineNo < 0) {
            return;
        }

        let lineNo = localVarEndLineNo + 1;
        
        source += "        " + this.localVarNameToDeclare + ": " + this.localVarTypeToDeclare + ";";

        let editor = vscode.window.activeTextEditor;
        await this.insertContentAsync(source, lineNo, editor);
    }

    protected async insertContentAsync(content: string, lineNo: number, editor : vscode.TextEditor | undefined) {
        content = content + "\n"; 

        if (!editor) {
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(lineNo, 0), content);
        });
    }

}

