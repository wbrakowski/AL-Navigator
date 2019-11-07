import * as vscode from 'vscode';

enum ObjectType {Table = 1, TableExtension = 2, Page = 3, PageExtension = 4, Report = 5, Codeunit = 6}
enum ObjectTypeString {'TABLE' = 1, 'TABLEEXTENSION' = 2, 'PAGE' = 3, 'PAGEEXTENSION' = 4, 'REPORT' = 5, 'CODEUNIT' = 6}

export class WorkSpaceALFile {
    public uri: vscode.Uri;
    public filePath: string;
    public fileName: string;
    public fileText: string;
    //public objectType: ObjectType;
    public objectName: string;
    //public objectNo: number;
    
    constructor(file : vscode.Uri) {
        this.uri = file;
        this.filePath = file.fsPath;
        this.fileName = this.getFileNameFromPath(this.filePath);
        this.fileText = this.getTextFromFile();
        console.log(this.fileText);
        this.objectName = this.extractObjectNameFromText(this.fileText);
        //this.objectType = this.extractObjectTypeFromText(this.fileText);
    }

    private getFileNameFromPath(path : string) : string {
        return path.replace(/^.*[\\\/]/, '');
    }

    private writeProcedureStubInALFIle(file: vscode.Uri, procedureStub: string) : string {
        // TODO
        const textEdits: vscode.TextEdit[] = [];
        textEdits.push(vscode.TextEdit.insert(new vscode.Position(0, 0), procedureStub));

        const workEdits = new vscode.WorkspaceEdit();
        workEdits.set(file, textEdits); 
        vscode.workspace.applyEdit(workEdits); 

        //vscode.workspace.openTextDocument(filePath).then(newdoc => vscode.window.showTextDocument(newdoc, { preserveFocus: true, viewColumn: vscode.ViewColumn.Active, preview: false }))

        return "";
    }

    private getTextFromFile(): string {
        // TODO
        let fileText : string = "";
        vscode.workspace.openTextDocument(this.uri).then((document) => {
            //vscode.window.showTextDocument(document).then();
            fileText = document.getText();
            //return(document.getText());
          });
        //return "";
        return fileText;
    }

    private extractObjectNameFromText(text: string) : string {
        for(let ots in ObjectTypeString) {
            if (isNaN(Number(ots))) {
                let otsIndex : number = text.indexOf(ots);
                if(otsIndex > -1) {
                    let objectName : string = text.substr(otsIndex + 1);
                    console.log(objectName);
                    return objectName;
                }
            }
        }
        return "";
    }

    // private extractObjectTypeFromText(text: string) : ObjectType {
    //     for(let ots in ObjectTypeString) {
    //         if (isNaN(Number(ots))) {
    //             if(text.indexOf(ots) > -1) {
    //                 return (ObjectType[ots]);
    //             }
    //         }
    //     }
    //     return ObjectType.Codeunit;
    // }

 }