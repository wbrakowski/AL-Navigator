import { workspace, ExtensionContext, commands, window, Selection, Range, Position, TextLine, TextEditor } from 'vscode';
import { ALFileCrawler } from '../alFileCrawler';

export module FileJumper {
   export function jumpToNextDataItem() {
        let text : string = "DATAITEM(";        
        jumpToNextTextOccurence(text);
   }

   export function jumpToNextOnAfterGetRecordTrigger(){
        let text : string = "TRIGGER ONAFTERGETRECORD(";
        jumpToNextTextOccurence(text);
   }

   export function jumpToKeys(){
        let text : string = "KEYS";
        jumpToNextTextOccurence(text);
   }

   export function jumpToNextTrigger(){
        let text : string = "TRIGGER ON";
        jumpToNextTextOccurence(text);
   }

   export function jumpToNextActions(){
        let text : string = "ACTIONS";
        jumpToNextTextOccurence(text);
   }

   export function jumpToLastLocalVarLine() {
       let editor = window.activeTextEditor;
       let startNo: number = ALFileCrawler.findLocalVarSectionStartLineNo();
       if (startNo > 0) {
            let endNo = ALFileCrawler.findLocalVarSectionEndLineNo(false, startNo);
            jumpToLine(endNo);
       }
   }

   function jumpToNextTextOccurence(text: string)
   {
       let lineNo: number = ALFileCrawler.findNextTextLineNo(text, false);
       if (lineNo === -1) {
            //let infoText : string = `Line with text "${ text }" not found after current line. Search started at line 1.`;
            //window.showInformationMessage(infoText);
            lineNo = ALFileCrawler.findNextTextLineNo(text, false, 0);
       }
    
        jumpToLine(lineNo);
    }

    function jumpToLine(no: number): void {
     let editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        let range = editor.document.lineAt(no).range;
        editor.selection = new Selection(range.end, range.end);
        let revealRange : Range;
        revealRange = new Range(new Position(range.end.line - 10, 0), new Position(range.end.line + 10, 0));
        editor.revealRange(revealRange);    
    }
}