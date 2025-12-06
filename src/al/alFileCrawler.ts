import { TextLine, TextEditor, window, Range, Selection, TextDocument, TextEditorCursorStyle, Position } from 'vscode';
import { ALKeywordHelper } from './alKeyWordHelper';
import { ALFile } from './alFile';
import * as vscode from 'vscode';
import { CommandType } from './codeActions/commandType';
import { ALVariableOrdering } from './alVariableOrdering';

export module ALFileCrawler {
    //#region text search
    export function findLocalVarSectionStartLineNo(): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }
        let lastLineNo: number = editor.selection.end.line;
        let foundLineNo: number = -1;

        // Search backwards from cursor position to find the closest local var section
        for (let i = lastLineNo; i >= 0; i--) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();

            // Skip empty lines and comments
            if (currLineText === "" || currLineText.startsWith("//")) {
                continue;
            }

            // Found a VAR keyword - this is our local var section
            if (currLineText === "VAR") {
                foundLineNo = i;
                break;
            }
            // Found a procedure or trigger declaration
            else if (hasProcedureOrTriggerHints(currLineText)) {
                // We've reached the procedure/trigger declaration without finding a var section
                // This means there's no var section yet, but we need to return where it should be created
                // Don't set foundLineNo here - it will remain -1 to indicate no var section exists
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

        // Strategy: Find the LAST standalone var section in the file
        // Global var is typically the last var block before the closing } of the object
        // We look for var sections that are NOT inside procedures/triggers

        let foundLineNo = -1;
        let insideProcedureOrTrigger = false;
        let procedureBeginEndDepth = 0;
        let insideStructuralBlock = false;
        let structuralBlockDepth = 0;

        for (let i = 0; i < editor.document.lineCount; i++) {
            let currLine = editor.document.lineAt(i);
            let currLineText = currLine.text.trim().toUpperCase();

            // Skip empty lines and comments
            if (currLineText === "" || currLineText.startsWith("//")) {
                continue;
            }

            // Track structural blocks like dataset { }, requestpage { }, actions { }
            // These are NOT procedures but contain triggers
            const structuralKeywords = ["DATASET", "REQUESTPAGE", "ACTIONS", "LAYOUT", "ELEMENTS"];
            for (let keyword of structuralKeywords) {
                if (currLineText.startsWith(keyword) || currLineText.includes(" " + keyword)) {
                    if (currLineText.includes("{")) {
                        insideStructuralBlock = true;
                        structuralBlockDepth = 1;
                        break; // Found the keyword, no need to check others
                    }
                }
            }

            // Track { } for structural blocks
            if (insideStructuralBlock) {
                for (let char of currLineText) {
                    if (char === '{') {
                        structuralBlockDepth++;
                    } else if (char === '}') {
                        structuralBlockDepth--;
                        if (structuralBlockDepth <= 0) {
                            insideStructuralBlock = false;
                            structuralBlockDepth = 0;
                            break;
                        }
                    }
                }
            }

            // Check if we're entering a procedure or trigger
            // Note: Triggers inside structural blocks (dataset/requestpage) will still be detected
            // but that's OK because we check both conditions later
            if (hasProcedureOrTriggerHints(currLineText)) {
                insideProcedureOrTrigger = true;
                procedureBeginEndDepth = 0;
            }

            // Track begin/end depth when inside a procedure or trigger
            if (insideProcedureOrTrigger) {
                // Check for BEGIN keyword (start of procedure body)
                if (currLineText.startsWith("BEGIN") || currLineText.includes(" BEGIN") || currLineText === "BEGIN") {
                    procedureBeginEndDepth++;
                }
                // Check for END keyword
                else if (currLineText.startsWith("END;") || currLineText.startsWith("END ") || currLineText === "END;") {
                    procedureBeginEndDepth--;
                    // If we're back to depth 0, we've exited the procedure/trigger
                    if (procedureBeginEndDepth <= 0) {
                        insideProcedureOrTrigger = false;
                        procedureBeginEndDepth = 0;
                    }
                }
            }

            // Check for VAR keyword
            if (currLineText === "VAR") {
                // Accept it if we're NOT inside a procedure/trigger
                // But we ALLOW it inside structural blocks (those are triggers inside dataitems/actions)
                if (!insideProcedureOrTrigger) {
                    // Store it, but continue searching - we want the LAST one
                    foundLineNo = i;
                    // If we're NOT in a structural block, this is likely the global var - we can break
                    if (!insideStructuralBlock) {
                        break;
                    }
                }
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

        // Search from the var keyword to find where the var section ends
        // It ends when we hit a procedure/trigger OR the closing brace of the object
        for (let i = startNo + 1; i <= editor.document.lineCount - 1; i++) {
            let currLine: TextLine = editor.document.lineAt(i);
            let currLineText: string = currLine.text.trim().toUpperCase();

            // Skip empty lines and comments
            if (currLineText === "" || currLineText.startsWith("//")) {
                continue;
            }

            // If we hit a procedure or trigger, the var section ended before it
            if (hasProcedureOrTriggerHints(currLineText)) {
                // Go back to find the last non-empty, non-comment line
                for (let j = i - 1; j > startNo; j--) {
                    let prevLine = editor.document.lineAt(j);
                    let prevLineText = prevLine.text.trim();
                    if (prevLineText !== "" && !prevLineText.startsWith("//")) {
                        endLineNo = j;
                        break;
                    }
                }
                break;
            }
            // If we hit the closing brace of the object, the var section ended before it
            else if (currLineText === "}") {
                // Go back to find the last non-empty, non-comment line
                for (let j = i - 1; j > startNo; j--) {
                    let prevLine = editor.document.lineAt(j);
                    let prevLineText = prevLine.text.trim();
                    if (prevLineText !== "" && !prevLineText.startsWith("//")) {
                        endLineNo = j;
                        break;
                    }
                }
                break;
            }
        }

        // If we didn't find an end, the var section might be the last thing in the file
        if (endLineNo === -1) {
            endLineNo = startNo;
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
            let currLineText: string = currLine.text.trim().toUpperCase();
            if (hasProcedureOrTriggerHints(currLineText)) {
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

    /**
     * Represents a parsed variable declaration with its line number and type.
     */
    interface VariableInfo {
        lineNo: number;
        variableName: string;
        variableType: string;
        fullLine: string;
    }

    /**
     * Parses variable declarations from a var section and returns information about each variable.
     * @param startLineNo The line number where the var section starts
     * @param endLineNo The line number where the var section ends
     * @returns Array of VariableInfo objects containing line number, name, type, and full line text
     */
    function parseVariablesInSection(startLineNo: number, endLineNo: number): VariableInfo[] {
        let editor = window.activeTextEditor;
        if (!editor || startLineNo < 0 || endLineNo < 0 || startLineNo >= endLineNo) {
            return [];
        }

        const variables: VariableInfo[] = [];

        // Start from the line after "var" keyword
        for (let i = startLineNo + 1; i <= endLineNo; i++) {
            const line = editor.document.lineAt(i);
            const lineText = line.text.trim();

            // Skip empty lines and comments
            if (lineText === '' || lineText.startsWith('//')) {
                continue;
            }

            // Parse variable declaration: variableName: Type subtype;
            // Examples:
            // Customer: Record Customer;
            // TempItem: Record Item temporary;
            // MyInt: Integer;
            // MyText: Text[50];

            const colonIndex = lineText.indexOf(':');
            if (colonIndex > 0) {
                // Extract variable name (everything before the colon)
                const variableName = lineText.substring(0, colonIndex).trim();

                // Get the part after the colon (the type declaration)
                const typeDeclaration = lineText.substring(colonIndex + 1).trim();

                // Extract the main type (first word before space, bracket, or semicolon)
                const typeMatch = typeDeclaration.match(/^(\w+)/);
                if (typeMatch) {
                    const variableType = typeMatch[1];
                    variables.push({
                        lineNo: i,
                        variableName: variableName,
                        variableType: variableType,
                        fullLine: lineText
                    });
                }
            }
        }

        return variables;
    }

    /**
     * Finds the correct line number to insert a new variable based on AL variable ordering rules.
     * Variables should be ordered by type: Record, Report, Codeunit, XmlPort, Page, Query, 
     * Notification, BigText, DateFormula, RecordId, RecordRef, FieldRef, FilterPageBuilder.
     * Other types are not sorted and should appear after sorted types.
     * Within the same type, variables are sorted alphabetically by name.
     * 
     * @param cmdType The command type (LocalVariable, GlobalVariable, Parameter)
     * @param newVariableType The type of the variable to be inserted (e.g., "Record", "Integer")
     * @param newVariableName The name of the variable to be inserted (e.g., "Customer", "MyInt")
     * @returns The line number where the variable should be inserted
     */
    export function findVariableInsertLineWithSorting(cmdType: CommandType, newVariableType: string, newVariableName: string): number {
        let editor = window.activeTextEditor;
        if (!editor) {
            return -1;
        }

        let varSectionStartLineNo: number;
        let varSectionEndLineNo: number;
        let createVarSection: boolean = false;

        // Find the var section based on command type
        switch (cmdType) {
            case CommandType.LocalVariable: {
                varSectionStartLineNo = findLocalVarSectionStartLineNo();
                if (varSectionStartLineNo === -1) {
                    // No var section exists, return end line for creating one
                    return findLocalVarSectionEndLineNo(true) + 1;
                }
                varSectionEndLineNo = findLocalVarSectionEndLineNo(false, varSectionStartLineNo);
                break;
            }
            case CommandType.GlobalVariable: {
                varSectionStartLineNo = findGlobalVarSectionStartLineNo();
                if (varSectionStartLineNo === -1) {
                    // No var section exists, return position for creating one
                    return findGlobalVarCreationPos();
                }
                varSectionEndLineNo = findGlobalVarSectionEndLineNo(varSectionStartLineNo);
                break;
            }
            case CommandType.Parameter: {
                // Parameters don't use sorting
                return findProcedureStartLineNo();
            }
            default: {
                return -1;
            }
        }

        if (varSectionStartLineNo < 0 || varSectionEndLineNo < 0) {
            return -1;
        }

        // Parse existing variables in the section
        const existingVariables = parseVariablesInSection(varSectionStartLineNo, varSectionEndLineNo);

        // If no variables exist yet, insert after the "var" keyword
        if (existingVariables.length === 0) {
            return varSectionStartLineNo + 1;
        }

        // Get sort priority for the new variable
        const newVarPriority = ALVariableOrdering.getVariableTypeSortPriority(newVariableType);

        // Two-level sorting:
        // 1. By type priority (Record, Report, Codeunit, ... then unsorted types)
        // 2. Within same type, alphabetically by variable name

        let insertLineNo = -1;
        let lastSameTypeLineNo = -1;

        for (let i = 0; i < existingVariables.length; i++) {
            const existingVar = existingVariables[i];
            const existingVarPriority = ALVariableOrdering.getVariableTypeSortPriority(existingVar.variableType);

            // If we find a variable with higher priority (different type group), insert before it
            if (existingVarPriority > newVarPriority) {
                insertLineNo = existingVar.lineNo;
                break;
            }

            // If same type priority, check alphabetical order
            if (existingVarPriority === newVarPriority) {
                // Same type - check if it's the exact same type (not just same priority)
                if (existingVar.variableType.toUpperCase() === newVariableType.toUpperCase()) {
                    // Exact same type - compare names alphabetically (case-insensitive)
                    const comparison = newVariableName.toUpperCase().localeCompare(existingVar.variableName.toUpperCase());

                    if (comparison < 0) {
                        // New variable name comes before this existing one alphabetically
                        insertLineNo = existingVar.lineNo;
                        break;
                    } else {
                        // New variable name comes after - remember this position
                        lastSameTypeLineNo = existingVar.lineNo;
                    }
                } else {
                    // Same priority but different type (both unsorted types)
                    // Keep track of where this type group ends
                    lastSameTypeLineNo = existingVar.lineNo;
                }
            }
        }

        // Determine final insertion point
        if (insertLineNo === -1) {
            if (lastSameTypeLineNo !== -1) {
                // Insert after the last variable of the same type
                insertLineNo = lastSameTypeLineNo + 1;
            } else {
                // No variables of same type found, insert after the last variable
                const lastVariable = existingVariables[existingVariables.length - 1];
                insertLineNo = lastVariable.lineNo + 1;
            }
        }

        return insertLineNo;
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

/**
 * Enhanced function to detect if a line of text indicates the start of a procedure or trigger.
 * Handles various AL patterns including:
 * - procedure MyProc() - standard procedures
 * - local procedure MyProc() - local procedures  
 * - internal procedure MyProc() - internal procedures
 * - trigger OnInsert() - triggers without parameters
 * - trigger OnValidate(var Rec: Record) - triggers with parameters
 * - procedure MyProc( - multi-line procedure declarations (opening bracket without closing)
 * 
 * @param text The line of text to check (should be trimmed and uppercase)
 * @returns true if the text contains procedure or trigger hints
 */
function hasProcedureOrTriggerHints(text: string): boolean {
    // Skip comments
    if (text.startsWith("//")) {
        return false;
    }

    // Check for TRIGGER keyword
    // Handles both: "trigger OnRun()" and "trigger OnValidate(var Rec: Record Customer)"
    if (text.includes("TRIGGER")) {
        // Must have an opening bracket to be a trigger declaration
        return text.includes("(");
    }

    // Check for PROCEDURE keyword (handles local, internal, and standard procedures)
    // Handles: "procedure MyProc()", "local procedure", "internal procedure"
    // Also handles multi-line: "procedure MyProc(" without closing bracket
    if (text.includes("PROCEDURE")) {
        // Must have an opening bracket to be a procedure declaration
        return text.includes("(");
    }

    return false;
}

