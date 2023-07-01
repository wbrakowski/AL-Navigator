import { workspace, ExtensionContext, commands, window, Selection, Range, Position, TextLine, TextEditor } from 'vscode';
import { ALFileCrawler } from '../al/alFileCrawler';

export module FileJumper {
   export function jumpToNextDataItem() {
        let text : string = "DATAITEM(";        
        let excludeText : string = 'ON';
        jumpToNextTextOccurence(text, false, excludeText);
   }
   export function jumpToNextDataItemFromBottom() {
     let text : string = "DATAITEM(";        
     let excludeText : string = 'ON';
     jumpToNextTextOccurence(text, true, excludeText);
}

   export function jumpToNextOnAfterGetRecordTrigger(){
        let text : string = "TRIGGER ONAFTERGETRECORD(";
        jumpToNextTextOccurence(text, false);
   }

   export function jumpToKeys(){
        let text : string = "KEYS";
        jumpToNextTextOccurence(text, false);
   }

   export function jumpToNextTrigger(){
        let text : string = "TRIGGER ON";
        jumpToNextTextOccurence(text,false);
   }

   export function jumpToNextOnDeleteTrigger(){
     let text : string = "TRIGGER ONDELETE";
     jumpToNextTextOccurence(text, false);
     }

     export function jumpToNextOnModifyTrigger(){
          let text : string = "TRIGGER ONMODIFY";
          jumpToNextTextOccurence(text, false);
     }
     export function jumpToNextOnInsertTrigger(){
          let text : string = "TRIGGER ONINSERT";
          jumpToNextTextOccurence(text, false);
     }

   export function jumpToNextActions(){
     //    let text : string = "ACTIONS";
        let text : string = "ACTION(";
        let excludeText : string = 'TRIGGER';
        jumpToNextTextOccurence(text, false, excludeText);
   }

   export function jumpToLastLocalVarLine() {
       let startNo: number = ALFileCrawler.findLocalVarSectionStartLineNo();
       if (startNo > 0) {
            let endNo = ALFileCrawler.findLocalVarSectionEndLineNo(false, startNo);
            jumpToLine(endNo);
       }
   }

   export function jumpToLastGlobalVarLine() {
     let startNo: number = ALFileCrawler.findGlobalVarSectionStartLineNo();
     if (startNo > 0) {
          let endNo = ALFileCrawler.findGlobalVarSectionEndLineNo(startNo);
          jumpToLine(endNo);
     }
 }

   export function jumpToNextTextOccurence(text: string, startingFromBottom: boolean, excludeText?: string)
   {
       let lineNo: number = ALFileCrawler.findNextTextLineNo(text, false, startingFromBottom, undefined, undefined, excludeText);
       if (lineNo === -1) {
            if (startingFromBottom) {
                 if (window.activeTextEditor) {
                      lineNo = window.activeTextEditor.document.lineCount - 1;
                 }
                 else {
                      return;
                 }
            }
            else {
                 lineNo = ALFileCrawler.findNextTextLineNo(text, false, startingFromBottom, 0);
            }
       }
        jumpToLine(lineNo);
    }

    export function jumpToLine(no: number, textEditor?: TextEditor): void {
      let editor = textEditor? textEditor : window.activeTextEditor;
        if (!editor) {
            return;
        }

        try {
          let range = editor.document.lineAt(no).range;
          editor.selection = new Selection(range.end, range.end);
          let revealRange : Range;
          revealRange = new Range(new Position(range.end.line - 10, 0), new Position(range.end.line + 10, 0));
          editor.revealRange(revealRange);    
        }
        catch (error) {
             console.log('Whoops. Something went wrong when trying to jump through the file.');
        }

      
    }
}