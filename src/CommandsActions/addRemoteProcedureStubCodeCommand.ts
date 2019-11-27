import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFiles} from '../alFiles';
import { ALWriter } from '../alWriter';
import { TextBuilder } from '../textBuilder';

export class ALAddRemoteProcedureStubCodeCommand extends ALCodeCommand {
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
        let procedureStub: string = TextBuilder.buildProcedureStubText(false);
        if (procedureStub) {
            this._alWriter.writeStubInFile(procedureStub);
        }
    }

   
}

