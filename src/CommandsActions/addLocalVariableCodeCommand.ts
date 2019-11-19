import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFileOperations} from '../alFileOperations';
import { VariableCreator } from '../VariableCreator/variableCreator';

export class AddLocalVariableCodeCommand extends ALCodeCommand {
    public localVarNameToDeclare: string;
    public localVarTypeToDeclare: string;
    private _alFileOperations : ALFileOperations;
    get alFileOperations(): ALFileOperations {
        return this._alFileOperations;
    }
    set alFileOperations(value : ALFileOperations){
        this._alFileOperations = value;
    }
    private _varCreator: VariableCreator;
    get varCreator(): VariableCreator {
        return this._varCreator;
    }
    set varCreator(value : VariableCreator){
        this._varCreator = value;
    }

    constructor(context : vscode.ExtensionContext, commandName: string, alFileOperations: ALFileOperations, varCreator : VariableCreator) {
        super(context, commandName);
        this._alFileOperations = alFileOperations;
        this._varCreator = varCreator;
        this.localVarNameToDeclare = "";
        this.localVarTypeToDeclare = "";
    }

    public clearVarsToDeclare(): void {
        this.localVarNameToDeclare = "";
        this.localVarTypeToDeclare = "";
    }
    
    protected async runAsync(range: vscode.Range) {
        this._alFileOperations.clearContent();

        let localVarStartLineNo = this._alFileOperations.findLocalVarSectionStartLineNo(range);
        let localVarEndLineNo = this._alFileOperations.findLocalVarSectionEndLineNo(localVarStartLineNo);

        if (localVarEndLineNo < 0) {
            return;
        }

        let lineNo = localVarEndLineNo - 1;
        let source = "          " + this.localVarNameToDeclare + ": " + this.localVarTypeToDeclare + ";";

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

