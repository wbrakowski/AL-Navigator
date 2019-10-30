import * as vscode from 'vscode';
import {ALCodeCommand} from "./alCodeCommand";
import { ALNavigatorExtensionContext } from './alNavigatorExtensionContext';
import { ALSyntaxWriter } from './alSyntaxWriter';
import { ALFileOperations } from './alFileOperations';

export class ALAddProcedureStubCodeCommand extends ALCodeCommand {
    constructor(context : ALNavigatorExtensionContext, commandName: string) {
        super(context, commandName);
    }
    
    protected async runAsync(range: vscode.Range) {
        let writer: ALSyntaxWriter = new ALSyntaxWriter();
        
        writer.incIndent();
        let procedureStub: string = ALFileOperations.buildProcedureStubText();
        writer.writeProcedureStub(procedureStub);
        let lineNo = ALFileOperations.procedureStubStartingLineNo();
        let source = writer.toString();

        await this.insertContentAsync(source, lineNo);
    }

    protected async insertContentAsync(content: string, lineNo: number) {
        content = '\n' + content; 

        if (!vscode.window.activeTextEditor) {
            return;
        }

        await vscode.window.activeTextEditor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(lineNo, 0), content);
        });
    }

}

