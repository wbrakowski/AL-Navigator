import * as vscode from 'vscode';

/**
 * Fixes irregular RDL expressions commonly found in Business Central reports
 * These errors often occur during copy/paste operations or migrations
 */
export class RdlExpressionFixer {

    /**
     * Pattern definitions for irregular expressions and their corrections
     * Each pattern includes the regex to find the error and the correct replacement
     */
    private static readonly IRREGULAR_PATTERNS = [
        {
            name: 'Code.GetData without parameters',
            pattern: /Code\.GetData(?!\()/g,
            replacement: 'Code.GetData(1,1)',
            description: 'Code.GetData must include parameters (row, column)'
        },
        {
            name: 'Code.SetData without parameters',
            pattern: /Code\.SetData(?!\()/g,
            replacement: 'Code.SetData(1,1,value)',
            description: 'Code.SetData must include parameters (row, column, value)'
        },
        {
            name: 'Code.GetData with incomplete parameters',
            pattern: /Code\.GetData\(\s*\d+\s*\)/g,
            replacement: 'Code.GetData(1,1)',
            description: 'Code.GetData requires both row and column parameters'
        },
        {
            name: 'Code.SetData with incomplete parameters',
            pattern: /Code\.SetData\(\s*\d+\s*,\s*\d+\s*\)/g,
            replacement: 'Code.SetData(1,1,value)',
            description: 'Code.SetData requires row, column, and value parameters'
        },
        {
            name: 'Incomplete BlankZero function',
            pattern: /=BlankZero\(\s*$/gm,
            replacement: '=BlankZero(0)',
            description: 'BlankZero function requires a parameter'
        },
        {
            name: 'Incomplete BlankNeg function',
            pattern: /=BlankNeg\(\s*$/gm,
            replacement: '=BlankNeg(0)',
            description: 'BlankNeg function requires a parameter'
        },
        {
            name: 'Incomplete BlankPos function',
            pattern: /=BlankPos\(\s*$/gm,
            replacement: '=BlankPos(0)',
            description: 'BlankPos function requires a parameter'
        },
        {
            name: 'Fields! reference without .Value',
            pattern: /=Fields!([A-Za-z0-9_]+)(?!\.Value)(?=\s*[<)"\s=&+\-*/>])/g,
            replacement: '=Fields!$1.Value',
            description: 'Fields collection reference must include .Value property'
        },
        {
            name: 'Fields! without field name (followed by operator)',
            pattern: /=Fields!\s*(?![A-Za-z0-9_])(?=\s*[=<>&+\-*/>])/g,
            replacement: '=Fields!FieldName.Value',
            description: 'Fields collection requires a field name and .Value property'
        },
        {
            name: 'Fields! without field name (with .Value)',
            pattern: /Fields!\s*\.Value/g,
            replacement: 'Fields!FieldName.Value',
            description: 'Fields collection requires a field name'
        },
        {
            name: 'Parameters! reference without .Value',
            pattern: /=Parameters!([A-Za-z0-9_]+)(?!\.Value)(?=\s*[<)"\s=&+\-*/>])/g,
            replacement: '=Parameters!$1.Value',
            description: 'Parameters collection reference must include .Value property'
        },
        {
            name: 'Parameters! without parameter name (followed by operator)',
            pattern: /=Parameters!\s*(?![A-Za-z0-9_])(?=\s*[=<>&+\-*/>])/g,
            replacement: '=Parameters!ParameterName.Value',
            description: 'Parameters collection requires a parameter name and .Value property'
        },
        {
            name: 'Parameters! without parameter name (with .Value)',
            pattern: /Parameters!\s*\.Value/g,
            replacement: 'Parameters!ParameterName.Value',
            description: 'Parameters collection requires a parameter name'
        },
        {
            name: 'ReportItems! reference without .Value',
            pattern: /=ReportItems!([A-Za-z0-9_]+)(?!\.Value)(?=\s*[<)"\s=&+\-*/>])/g,
            replacement: '=ReportItems!$1.Value',
            description: 'ReportItems collection reference must include .Value property'
        },
        {
            name: 'ReportItems! without item name (followed by operator)',
            pattern: /=ReportItems!\s*(?![A-Za-z0-9_])(?=\s*[=<>&+\-*/>])/g,
            replacement: '=ReportItems!ItemName.Value',
            description: 'ReportItems collection requires an item name and .Value property'
        },
        {
            name: 'ReportItems! without item name (with .Value)',
            pattern: /ReportItems!\s*\.Value/g,
            replacement: 'ReportItems!ItemName.Value',
            description: 'ReportItems collection requires an item name'
        },
        {
            name: 'Incomplete IIF statement',
            pattern: /=IIf\([^,)]*\)(?!\s*,)/g,
            replacement: '=IIf(condition, trueValue, falseValue)',
            description: 'IIf function requires three parameters: condition, trueValue, falseValue'
        },
        {
            name: 'Choose function with incomplete parameters',
            pattern: /Choose\([^,)]*\)/g,
            replacement: 'Choose(index, value1, value2)',
            description: 'Choose function requires at least index and one value'
        },
        {
            name: 'Incomplete Format function',
            pattern: /=Format\([^,)]*\)$/gm,
            replacement: '=Format(value, "format")',
            description: 'Format function should include a format string'
        },
        {
            name: 'GetGroupPageNumber without parameters',
            pattern: /GetGroupPageNumber\(\s*\)/g,
            replacement: 'GetGroupPageNumber(NewPage, PageNumber)',
            description: 'GetGroupPageNumber requires NewPage and PageNumber parameters'
        },
        {
            name: 'IsNewPage without parameters',
            pattern: /IsNewPage\(\s*\)/g,
            replacement: 'IsNewPage(group1, group2, group3)',
            description: 'IsNewPage requires group parameters'
        },
        {
            name: 'CopyText function without parameter',
            pattern: /GetCopyText\(\s*\)/g,
            replacement: 'GetCopyText(Txt)',
            description: 'GetCopyText requires a text parameter'
        },
        {
            name: 'Incomplete Sum aggregation',
            pattern: /=Sum\(\s*\)/g,
            replacement: '=Sum(Fields!FieldName.Value)',
            description: 'Sum function requires a field reference'
        },
        {
            name: 'Incomplete Count aggregation',
            pattern: /=Count\(\s*\)/g,
            replacement: '=Count(Fields!FieldName.Value)',
            description: 'Count function requires a field reference'
        },
        {
            name: 'User! without property',
            pattern: /User!\s*$/gm,
            replacement: 'User!Language',
            description: 'User collection requires a property (Language, UserID, etc.)'
        },
        {
            name: 'Globals! without property',
            pattern: /Globals!\s*$/gm,
            replacement: 'Globals!PageNumber',
            description: 'Globals collection requires a property (PageNumber, TotalPages, etc.)'
        },
        {
            name: 'Empty expression value',
            pattern: /<Value>=<\/Value>/g,
            replacement: '<Value>=""""</Value>',
            description: 'Expression cannot be empty, use empty string ""'
        },
        {
            name: 'Double equals (comparison operator)',
            pattern: /=([^=]+)==([^=])/g,
            replacement: '=$1=$2',
            description: 'RDL uses single = for comparison, not =='
        },
        {
            name: 'Previous() without field reference',
            pattern: /Previous\(\s*\)/g,
            replacement: 'Previous(Fields!FieldName.Value)',
            description: 'Previous() requires a field reference'
        },
        {
            name: 'CStr() without parameter',
            pattern: /CStr\(\s*\)/g,
            replacement: 'CStr(value)',
            description: 'CStr() requires a value to convert'
        },
        {
            name: 'CInt() without parameter',
            pattern: /CInt\(\s*\)/g,
            replacement: 'CInt(value)',
            description: 'CInt() requires a value to convert'
        },
        {
            name: 'CDbl() without parameter',
            pattern: /CDbl\(\s*\)/g,
            replacement: 'CDbl(value)',
            description: 'CDbl() requires a value to convert'
        },
        {
            name: 'Left() without parameters',
            pattern: /Left\(\s*\)/g,
            replacement: 'Left(text, length)',
            description: 'Left() requires text and length parameters'
        },
        {
            name: 'Right() without parameters',
            pattern: /Right\(\s*\)/g,
            replacement: 'Right(text, length)',
            description: 'Right() requires text and length parameters'
        },
        {
            name: 'Mid() without parameters',
            pattern: /Mid\(\s*\)/g,
            replacement: 'Mid(text, start, length)',
            description: 'Mid() requires text, start, and length parameters'
        },
        {
            name: 'InStr() without parameters',
            pattern: /InStr\(\s*\)/g,
            replacement: 'InStr(text, searchText)',
            description: 'InStr() requires text and searchText parameters'
        },
        {
            name: 'Replace() without parameters',
            pattern: /Replace\(\s*\)/g,
            replacement: 'Replace(text, oldText, newText)',
            description: 'Replace() requires text, oldText, and newText parameters'
        },
        {
            name: 'Len() without parameter',
            pattern: /Len\(\s*\)/g,
            replacement: 'Len(text)',
            description: 'Len() requires a text parameter'
        },
        {
            name: 'Trim() without parameter',
            pattern: /Trim\(\s*\)/g,
            replacement: 'Trim(text)',
            description: 'Trim() requires a text parameter'
        },
        {
            name: 'UCase() without parameter',
            pattern: /UCase\(\s*\)/g,
            replacement: 'UCase(text)',
            description: 'UCase() requires a text parameter'
        },
        {
            name: 'LCase() without parameter',
            pattern: /LCase\(\s*\)/g,
            replacement: 'LCase(text)',
            description: 'LCase() requires a text parameter'
        },
        {
            name: 'Lookup() incomplete',
            pattern: /Lookup\([^,)]*,[^,)]*,[^,)]*\)(?!\s*,)/g,
            replacement: 'Lookup(expression, sourceExpression, sourceScope, destExpression)',
            description: 'Lookup() requires 4 parameters: expression, sourceExpression, sourceScope, destExpression'
        },
        {
            name: 'RunningValue() incomplete',
            pattern: /RunningValue\([^,)]*\)/g,
            replacement: 'RunningValue(expression, function, scope)',
            description: 'RunningValue() requires expression, function (Sum/Count/etc), and scope'
        },
        {
            name: 'FormatDateTime() without format',
            pattern: /FormatDateTime\(([^,)]+)\)$/gm,
            replacement: 'FormatDateTime($1, DateFormat.ShortDate)',
            description: 'FormatDateTime() should include format parameter'
        },
        {
            name: 'FormatNumber() without decimals',
            pattern: /FormatNumber\(([^,)]+)\)$/gm,
            replacement: 'FormatNumber($1, 2)',
            description: 'FormatNumber() should include decimal places parameter'
        },
        {
            name: 'IsNothing() without parameter',
            pattern: /IsNothing\(\s*\)/g,
            replacement: 'IsNothing(value)',
            description: 'IsNothing() requires a value parameter'
        },
        {
            name: 'Avg() without field reference',
            pattern: /=Avg\(\s*\)/g,
            replacement: '=Avg(Fields!FieldName.Value)',
            description: 'Avg() function requires a field reference'
        },
        {
            name: 'Min() without field reference',
            pattern: /=Min\(\s*\)/g,
            replacement: '=Min(Fields!FieldName.Value)',
            description: 'Min() function requires a field reference'
        },
        {
            name: 'Max() without field reference',
            pattern: /=Max\(\s*\)/g,
            replacement: '=Max(Fields!FieldName.Value)',
            description: 'Max() function requires a field reference'
        }
    ];

    /**
     * Find all irregular expressions in the document
     */
    public static findIrregularExpressions(document: vscode.TextDocument): {
        line: number;
        column: number;
        pattern: string;
        description: string;
        match: string;
    }[] {
        const irregularExpressions: {
            line: number;
            column: number;
            pattern: string;
            description: string;
            match: string;
        }[] = [];

        const text = document.getText();
        const lines = text.split('\n');

        this.IRREGULAR_PATTERNS.forEach(pattern => {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let match;
                const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

                while ((match = regex.exec(line)) !== null) {
                    irregularExpressions.push({
                        line: i,
                        column: match.index,
                        pattern: pattern.name,
                        description: pattern.description,
                        match: match[0]
                    });
                }
            }
        });

        return irregularExpressions;
    }

    /**
     * Replace all irregular expressions with correct ones
     */
    public static async replaceIrregularExpressions(document: vscode.TextDocument): Promise<number> {
        const edit = new vscode.WorkspaceEdit();
        let totalReplacements = 0;

        this.IRREGULAR_PATTERNS.forEach(pattern => {
            const text = document.getText();
            const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
            let match;
            const replacements: { range: vscode.Range; newText: string }[] = [];

            while ((match = regex.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);

                replacements.push({
                    range: range,
                    newText: pattern.replacement
                });
                totalReplacements++;
            }

            // Apply replacements in reverse order to maintain positions
            replacements.reverse().forEach(replacement => {
                edit.replace(document.uri, replacement.range, replacement.newText);
            });
        });

        await vscode.workspace.applyEdit(edit);
        return totalReplacements;
    }

    /**
     * Main entry point: Find and replace irregular expressions
     */
    public static async findAndReplaceExpressions(document: vscode.TextDocument): Promise<void> {
        const irregularExpressions = this.findIrregularExpressions(document);

        if (irregularExpressions.length === 0) {
            vscode.window.showInformationMessage('✓ No irregular RDL expressions found.');
            return;
        }

        const uniquePatterns = Array.from(new Set(irregularExpressions.map(e => e.pattern)));
        const message = `Found ${irregularExpressions.length} irregular expression(s) of ${uniquePatterns.length} type(s)`;

        const selection = await vscode.window.showWarningMessage(
            message,
            'Replace All',
            'Show Details',
            'Cancel'
        );

        if (selection === 'Replace All') {
            const count = await this.replaceIrregularExpressions(document);
            vscode.window.showInformationMessage(`✓ Replaced ${count} irregular expression(s).`);
        } else if (selection === 'Show Details') {
            this.showDetailsOutputChannel(irregularExpressions);
        }
    }

    /**
     * Show detailed information in output channel with clickable links and improved formatting
     */
    private static showDetailsOutputChannel(irregularExpressions: {
        line: number;
        column: number;
        pattern: string;
        description: string;
        match: string;
    }[]): void {
        const outputChannel = vscode.window.createOutputChannel('RDL Expression Checker');
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const fileName = editor.document.fileName;

        outputChannel.clear();

        // Header
        outputChannel.appendLine('╔═══════════════════════════════════════════════════════════════════════════════╗');
        outputChannel.appendLine('║                      RDL IRREGULAR EXPRESSIONS REPORT                         ║');
        outputChannel.appendLine('╚═══════════════════════════════════════════════════════════════════════════════╝');
        outputChannel.appendLine('');

        // Group by pattern type
        const groupedByPattern = new Map<string, typeof irregularExpressions>();
        irregularExpressions.forEach(expr => {
            if (!groupedByPattern.has(expr.pattern)) {
                groupedByPattern.set(expr.pattern, []);
            }
            groupedByPattern.get(expr.pattern)!.push(expr);
        });

        let patternIndex = 1;
        groupedByPattern.forEach((expressions, patternName) => {
            // Pattern header with count
            outputChannel.appendLine(`┌─ [${patternIndex}/${groupedByPattern.size}] ${patternName} (${expressions.length} occurrence${expressions.length > 1 ? 's' : ''})`);
            outputChannel.appendLine('│');

            // Description with icon
            outputChannel.appendLine(`│  📝 ${expressions[0].description}`);
            outputChannel.appendLine('│');

            // Occurrences with clickable links
            outputChannel.appendLine('│  📍 Locations:');
            expressions.forEach((expr, index) => {
                const prefix = index === expressions.length - 1 ? '└─' : '├─';
                outputChannel.appendLine(`│     ${prefix} ${fileName}(${expr.line + 1},${expr.column + 1})`);
                outputChannel.appendLine(`│        Found: "${expr.match}"`);
            });

            outputChannel.appendLine('│');
            outputChannel.appendLine('');
            patternIndex++;
        });

        // Summary footer
        outputChannel.appendLine('─'.repeat(85));
        outputChannel.appendLine(`📊 SUMMARY: Found ${irregularExpressions.length} irregular expression(s) across ${groupedByPattern.size} pattern type(s)`);
        outputChannel.appendLine('─'.repeat(85));
        outputChannel.appendLine('');
        outputChannel.appendLine('💡 TIP: Click on any file location above to jump directly to that line');

        outputChannel.show();
    }
}
