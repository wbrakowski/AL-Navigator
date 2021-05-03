import { TextLine, TextEditor, window, Range, Selection, TextDocument, TextEditorCursorStyle, Position } from 'vscode';
import { ALKeywordHelper } from './alKeyWordHelper';
import { ALFile } from './alFile';
import * as vscode from 'vscode';
import { CommandType } from '../additional/commandType';

export module ALFileCrawler {
    //#region text search
    export function findLocalVarSectionStartLineNo(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let lastLineNo: number = editor.selection.end.line;
        let foundLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "VAR") {
                foundLineNo = i;
                break;
            } else if (currLineText.includes("TRIGGER") || currLineText.includes("PROCEDURE")) {
                if (i === lastLineNo) {
                    foundLineNo = i + 1;
                }
                break;
            }
        }
        return foundLineNo;
    }

    export function findLocalVarSectionEndLineNo(procedureNoIfNoVarFound: boolean, startLineNo?: number): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let endLineNo: number = -1;

        let startNo: number = startLineNo ? startLineNo : findLocalVarSectionStartLineNo();
        if (startNo < 0 && procedureNoIfNoVarFound) {
            startNo = ALFileCrawler.findProcedureStartLineNo();
        }
        for (let i = startNo; i <= editor.document.lineCount - 1; i++) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "BEGIN") {
                endLineNo = i - 1;
                break;
            }
        }
        return endLineNo;
    }

    export function findGlobalVarSectionStartLineNo(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let foundLineNo = -1;
        let ignoreNext;
        for (let i = 0; i < editor.document.lineCount; i++) {
            let currLine = editor.document.lineAt(i);
            let currLineText = currLine.text.trim().toUpperCase();
            if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
                ignoreNext = true;
            } else if (currLineText.toUpperCase() === "VAR") {
                if (ignoreNext) {
                    ignoreNext = false;
                } else {
                    foundLineNo = i;
                    break;
                }

            } else if (currLineText.toUpperCase().indexOf("BEGIN") >= 0) {
                ignoreNext = false;
            }
        }
        return foundLineNo;
    }

    export function findGlobalVarSectionEndLineNo(startLineNo?: number): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let endLineNo: number = -1;

        let startNo: number = startLineNo ? startLineNo : findGlobalVarSectionStartLineNo();
        if (startNo < 0) {
            return -1;
        }
        for (let i = startNo; i <= editor.document.lineCount - 1; i++) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText.includes('PROCEDURE') || currLineText.includes('TRIGGER')) {
                endLineNo = i - 2;
                break;
            }
            else if (currLineText.includes('}')) {
                endLineNo = i;
                break;
            }
        }
        return endLineNo;
    }

    export function findNextTextLineNo(text: string, findLastNo: boolean, startingFromBottom: boolean, startNo?: number, endNo?: number, excludesText?: string): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let currLineNo = startNo !== undefined ? startNo : editor.selection.active.line + 1;
        let endLineNo = endNo !== undefined ? endNo : editor.document.lineCount;
        let foundLineNo = -1;
        let ignoreLine;
        if (startingFromBottom) {
            for (let i = currLineNo - 3; i > 0; i--) {
                let currLine = editor.document.lineAt(i);
                let currLineText = currLine.text.toUpperCase().trimLeft();
                if (currLineText.includes(text)) {
                    if (excludesText) {
                        ignoreLine = currLineText.includes(excludesText);
                    }
                    if (!ignoreLine) {
                        foundLineNo = i;
                        if (!findLastNo) {
                            return foundLineNo;
                        }
                    }
                }
            }

        }
        else {
            for (let i = currLineNo; i < endLineNo; i++) {
                let currLine = editor.document.lineAt(i);
                let currLineText = currLine.text.toUpperCase().trimLeft();
                if (currLineText.includes(text)) {
                    if (excludesText) {
                        ignoreLine = currLineText.includes(excludesText);
                    }
                    if (!ignoreLine) {
                        foundLineNo = i;
                        if (!findLastNo) {
                            return foundLineNo;
                        }
                    }
                }
            }
        }
        return foundLineNo;
    }

    //#endregion
    //#region text checking

    export function isComment(textToCheck: string): boolean {
        return (textToCheck.includes("//"));
    }
    //#endregion
    //#region text disscetion

    export function getText(lineNo: number): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let line = editor.document.lineAt(lineNo);
        return (line.text);
    }

    export function getCurrLineText(): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLine = editor.document.lineAt(editor.selection.start.line);
        let currLineText: string = currLine.text;

        return currLineText;
    }

    export function getRangeText(range: Range | Selection): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }
        let rangeText = editor.document.getText(range).trim();
        return rangeText;
    }

    export function getLineText(range: Range | Selection): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return "";
        }

        let currLine = editor.document.lineAt(range.start.line);
        let currLineText: string = currLine.text.trimLeft();
        if (isComment(currLineText)) {
            return "";
        }
        else {
            return currLineText;
        }
    }

    export function findProcedureStartLineNo(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let lastLineNo: number = editor.selection.end.line;
        let foundLocalProcLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim();
            if (currLineText.toUpperCase().indexOf("TRIGGER") >= 0 || currLineText.toUpperCase().indexOf("PROCEDURE") >= 0) {
                foundLocalProcLineNo = i;
                break;
            }
        }
        return foundLocalProcLineNo;
    }

    export function findGlobalVarCreationPos(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let lastLineNo: number = editor.document.lineCount - 1;
        let foundLineNo: number = -1;
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (currLineText === "}") {
                foundLineNo = i;
                break;
            }
        }
        return foundLineNo;
    }

    export function isProcedureCall(diagnosticRange: Range | Selection): boolean {
        // Check if the next character after the diagnostic range is a round opening paranthesis for a procedure call
        let range = new Range(diagnosticRange.start, new Position(diagnosticRange.end.line, diagnosticRange.end.character + 1));
        let rangeText = getRangeText(range);
        return rangeText.includes('(');
    }

    export function isPageField(diagnosticRange: Range | Selection): boolean {
        let currLineText = getText(diagnosticRange.start.line).trimLeft();
        if (!currLineText.startsWith('field')) {
            return false;
        }
        // Check if the next character after the diagnostic range is a round closing paranthesis
        let range = new Range(diagnosticRange.start, new Position(diagnosticRange.end.line, diagnosticRange.end.character + 1));
        let rangeText = getRangeText(range);
        return rangeText.includes(')');
    }

    export function findVariableInsertLine(cmdType: CommandType): number {
        switch (cmdType) {
            case CommandType.LocalVariable: {
                var lineNo = ALFileCrawler.findLocalVarSectionEndLineNo(true) + 1;
                break;
            }
            case CommandType.GlobalVariable: {
                lineNo = ALFileCrawler.findGlobalVarSectionEndLineNo();
                if (lineNo === -1) {
                    lineNo = ALFileCrawler.findGlobalVarCreationPos();
                }
                break;
            }
            case CommandType.Parameter: {
                lineNo = ALFileCrawler.findProcedureStartLineNo();
                break;
            }
            default: {
                lineNo = -1;
                break;
            }
        }
        return lineNo;
    }
}