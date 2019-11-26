import * as fs from 'fs';

export class ALWriter {
    public targetALFileName: string = "";
    public targetALObjectName: string = "";
    public targetALProcedureName: string = "";
    public targetALFilePath: string = "";

    constructor() {

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

    
}