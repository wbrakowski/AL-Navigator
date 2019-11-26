import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALFiles} from '../alFiles';
import { ALWriter } from '../alWriter';

export class ALAddRemoteProcedureStubCodeCommand extends ALCodeCommand {
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
        let procedureStub: string = this._alFiles.buildProcedureStubText(false);
        if (procedureStub) {
            this._alWriter.writeStubInFile(procedureStub);
        }
    }

   
}

