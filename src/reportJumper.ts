import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';

export module ReportJumper {
   export function jumpToNextDataItem() {
    let text : string = "DATAITEM(";
    jumpToNextTextOccurence(text);
   }

   export function jumpToNextOnAfterGetRecordTrigger(){
    let text : string = "TRIGGER ONAFTERGETRECORD(";
    jumpToNextTextOccurence(text);
   }

   function jumpToNextTextOccurence(text: string)
   {
    let editor = window.activeTextEditor;
    if (editor === undefined) {
        return;
    }
    

    let currentLineNo = editor.selection.active.line + 1;
    let onAfterGetRecLineNo = 1;
    for (let i = currentLineNo; i < editor.document.lineCount; i++) {
        let currLine = editor.document.lineAt(i);
        let currLineText = currLine.text.toUpperCase();
        currLineText = currLineText.trimLeft();
        currLineText = currLineText.substr(0, text.length);
        if (currLineText.indexOf(text) > -1) {
            onAfterGetRecLineNo = i;
            break;
        }
         
    }

    if (editor && onAfterGetRecLineNo >= 0) {
        let range = editor.document.lineAt(onAfterGetRecLineNo).range;
        editor.selection = new Selection(range.end, range.end);
        let revealRange = new Range(new Position(range.end.line - 10, 0), new Position(range.end.line + 10, 0));
        editor.revealRange(revealRange);
    }
   }
}