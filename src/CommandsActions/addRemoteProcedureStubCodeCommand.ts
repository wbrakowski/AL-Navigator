import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALSyntaxWriter } from '../alSyntaxWriter';
import { ALFileOperations} from '../alFileOperations';
import * as fs from 'fs';

export class ALAddRemoteProcedureStubCodeCommand extends ALCodeCommand {
    private _alFileOperations : ALFileOperations;
    get alFileOperations(): ALFileOperations {
        return this._alFileOperations;
    }
    set alFileOperations(value : ALFileOperations){
        this._alFileOperations = value;
    }
    public targetALFileName: string = "";
    public targetALObjectName: string = "";
    public targetALProcedureName: string = "";
    public targetALFilePath: string = "";

    constructor(context : vscode.ExtensionContext, commandName: string, alFileOperations: ALFileOperations) {
        super(context, commandName);
        this._alFileOperations = alFileOperations;
    }
    
    protected async runAsync(range: vscode.Range) {
        let procedureStub: string = this._alFileOperations.buildProcedureStubText(false);
        if (procedureStub) {
            this.writeStubInFile(this.targetALFilePath, procedureStub);
        }
    }

    private writeStubInFile(fileName : string, stub: string) {
        let fileText : string = fs.readFileSync(fileName, 'utf-8');
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
            fs.writeFileSync(fileName, fileTextWithStub, 'utf-8');
            this._alFileOperations.repopulateALFIlesArray();
            console.log('Stub added.');
        }
        
    }
}

