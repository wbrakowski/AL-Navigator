import * as vscode from 'vscode';

export class ReportFontFixer {
    private static readonly TARGET_FONT = 'Segoe UI';
    private static readonly BARCODE_FONT_PATTERNS = [
        /idautomation/i,
        /barcode/i,
        /code128/i,
        /code39/i,
        /ean/i,
        /upc/i,
        /qr/i,
        /datamatrix/i
    ];

    /**
     * Check if a font family is a barcode font
     */
    private static isBarcodeFont(fontFamily: string): boolean {
        return this.BARCODE_FONT_PATTERNS.some(pattern => pattern.test(fontFamily));
    }

    /**
     * Find all wrong font families in an RDL/RDLC document
     * Returns an array of matches with position information
     */
    public static findWrongFonts(document: vscode.TextDocument): { line: number; column: number; fontFamily: string }[] {
        const wrongFonts: { line: number; column: number; fontFamily: string }[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Regex to find <FontFamily>...</FontFamily> tags
        const fontFamilyRegex = /<FontFamily>(.*?)<\/FontFamily>/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;

            while ((match = fontFamilyRegex.exec(line)) !== null) {
                const fontFamily = match[1].trim();

                // Skip if it's already Segoe UI or a barcode font
                if (fontFamily !== this.TARGET_FONT && !this.isBarcodeFont(fontFamily)) {
                    wrongFonts.push({
                        line: i,
                        column: match.index,
                        fontFamily: fontFamily
                    });
                }
            }
        }

        return wrongFonts;
    }

    /**
     * Find textboxes without FontFamily definition (they default to Arial)
     * Returns line numbers and insertion positions
     */
    private static findTextboxesWithoutFont(document: vscode.TextDocument): { line: number; column: number; fontFamily: string }[] {
        const textboxesWithoutFont: { line: number; column: number; fontFamily: string }[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        let inTextRun = false;
        let inStyle = false;
        let textRunStartLine = -1;
        let styleStartLine = -1;
        let hasFontFamily = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Check if we're entering a TextRun
            if (trimmedLine.includes('<TextRun>')) {
                inTextRun = true;
                textRunStartLine = i;
                hasFontFamily = false;
                inStyle = false;
            }

            // Check if we're entering a Style section within TextRun
            if (inTextRun && trimmedLine.includes('<Style>')) {
                inStyle = true;
                styleStartLine = i;
            }

            // Check if FontFamily is defined in this Style
            if (inStyle && trimmedLine.includes('<FontFamily>')) {
                hasFontFamily = true;
            }

            // Check if we're leaving the Style section
            if (inStyle && trimmedLine.includes('</Style>')) {
                // If no FontFamily was found in this Style, we need to add it
                if (!hasFontFamily) {
                    // Find the position to insert (right after <Style>)
                    textboxesWithoutFont.push({
                        line: styleStartLine,
                        column: line.indexOf('</Style>'),
                        fontFamily: '(default Arial - needs Segoe UI)'
                    });
                }
                inStyle = false;
            }

            // Check if we're leaving the TextRun
            if (inTextRun && trimmedLine.includes('</TextRun>')) {
                inTextRun = false;
            }
        }

        return textboxesWithoutFont;
    }

    /**
     * Add FontFamily to textboxes that don't have one
     * Returns the number of additions made
     */
    private static async addMissingFontFamilies(document: vscode.TextDocument): Promise<number> {
        const textboxesWithoutFont = this.findTextboxesWithoutFont(document);

        if (textboxesWithoutFont.length === 0) {
            return 0;
        }

        const edit = new vscode.WorkspaceEdit();
        const text = document.getText();
        const lines = text.split('\n');

        // Process additions from end to start to maintain position accuracy
        textboxesWithoutFont.reverse().forEach(textbox => {
            const line = lines[textbox.line];
            const styleTagMatch = line.match(/<Style>/);

            if (styleTagMatch) {
                const insertPosition = new vscode.Position(textbox.line, styleTagMatch.index! + styleTagMatch[0].length);
                const indentation = line.match(/^\s*/)?.[0] || '';
                const fontFamilyTag = `\n${indentation}                        <FontFamily>${this.TARGET_FONT}</FontFamily>`;

                edit.insert(document.uri, insertPosition, fontFamilyTag);
            }
        });

        await vscode.workspace.applyEdit(edit);
        return textboxesWithoutFont.length;
    }

    /**
     * Replace all wrong font families with Segoe UI
     * Returns the number of replacements made
     */
    public static async replaceWrongFonts(document: vscode.TextDocument): Promise<number> {
        const wrongFonts = this.findWrongFonts(document);

        if (wrongFonts.length === 0) {
            return 0;
        }

        const edit = new vscode.WorkspaceEdit();
        const text = document.getText();

        // Process replacements from end to start to maintain position accuracy
        wrongFonts.reverse().forEach(font => {
            const lines = text.split('\n');
            const line = lines[font.line];
            const fontFamilyRegex = new RegExp(`<FontFamily>${this.escapeRegex(font.fontFamily)}</FontFamily>`, 'g');

            let match;
            while ((match = fontFamilyRegex.exec(line)) !== null) {
                const start = new vscode.Position(font.line, match.index);
                const end = new vscode.Position(font.line, match.index + match[0].length);
                const range = new vscode.Range(start, end);

                edit.replace(document.uri, range, `<FontFamily>${this.TARGET_FONT}</FontFamily>`);
            }
        });

        await vscode.workspace.applyEdit(edit);
        return wrongFonts.length;
    }

    /**
     * Escape special regex characters
     */
    private static escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Find and replace wrong font families with Segoe UI
     */
    public static async findAndReplaceFonts(document: vscode.TextDocument): Promise<void> {
        const wrongFonts = this.findWrongFonts(document);
        const textboxesWithoutFont = this.findTextboxesWithoutFont(document);
        const totalIssues = wrongFonts.length + textboxesWithoutFont.length;

        if (totalIssues === 0) {
            vscode.window.showInformationMessage('✓ All font families are correct (Segoe UI or barcode fonts).');
            return;
        }

        const uniqueFonts = Array.from(new Set(wrongFonts.map(f => f.fontFamily)));
        let message = '';

        if (wrongFonts.length > 0 && textboxesWithoutFont.length > 0) {
            message = `Found ${wrongFonts.length} wrong font familie(s) [${uniqueFonts.join(', ')}] and ${textboxesWithoutFont.length} textbox(es) without font definition (default Arial)`;
        } else if (wrongFonts.length > 0) {
            message = `Found ${wrongFonts.length} wrong font familie(s): ${uniqueFonts.join(', ')}`;
        } else {
            message = `Found ${textboxesWithoutFont.length} textbox(es) without font definition (default Arial)`;
        }

        vscode.window.showWarningMessage(
            message,
            'Replace All',
            'Show Details',
            'Cancel'
        ).then(async (selection) => {
            if (selection === 'Replace All') {
                const replacedCount = await this.replaceWrongFonts(document);
                const addedCount = await this.addMissingFontFamilies(document);
                const total = replacedCount + addedCount;

                let resultMessage = '✓ ';
                if (replacedCount > 0 && addedCount > 0) {
                    resultMessage += `Replaced ${replacedCount} font familie(s) and added Segoe UI to ${addedCount} textbox(es).`;
                } else if (replacedCount > 0) {
                    resultMessage += `Replaced ${replacedCount} font familie(s) with Segoe UI.`;
                } else {
                    resultMessage += `Added Segoe UI to ${addedCount} textbox(es).`;
                }

                vscode.window.showInformationMessage(resultMessage);
            } else if (selection === 'Show Details') {
                this.showDetailsOutputChannel(wrongFonts, textboxesWithoutFont);
            }
        });
    }

    /**
     * Show detailed information in output channel with clickable links and improved formatting
     */
    private static showDetailsOutputChannel(
        wrongFonts: { line: number; column: number; fontFamily: string }[],
        textboxesWithoutFont: { line: number; column: number; fontFamily: string }[]
    ): void {
        const outputChannel = vscode.window.createOutputChannel('Report Font Checker');
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const fileName = editor.document.fileName;
        const totalIssues = wrongFonts.length + textboxesWithoutFont.length;

        outputChannel.clear();

        // Header
        outputChannel.appendLine('╔═══════════════════════════════════════════════════════════════════════════════╗');
        outputChannel.appendLine('║                        REPORT FONT FAMILIES REPORT                            ║');
        outputChannel.appendLine('╚═══════════════════════════════════════════════════════════════════════════════╝');
        outputChannel.appendLine('');

        let sectionIndex = 1;
        const totalSections = (wrongFonts.length > 0 ? 1 : 0) + (textboxesWithoutFont.length > 0 ? 1 : 0);

        // Section 1: Wrong Font Families
        if (wrongFonts.length > 0) {
            // Group by font family
            const groupedByFont = new Map<string, typeof wrongFonts>();
            wrongFonts.forEach(font => {
                if (!groupedByFont.has(font.fontFamily)) {
                    groupedByFont.set(font.fontFamily, []);
                }
                groupedByFont.get(font.fontFamily)!.push(font);
            });

            outputChannel.appendLine(`┌─ [${sectionIndex}/${totalSections}] Wrong Font Families (${wrongFonts.length} occurrence${wrongFonts.length > 1 ? 's' : ''})`);
            outputChannel.appendLine('│');
            outputChannel.appendLine('│  📝 These fonts should be replaced with Segoe UI');
            outputChannel.appendLine('│     (Barcode fonts are automatically excluded)');
            outputChannel.appendLine('│');

            let fontIndex = 1;
            groupedByFont.forEach((occurrences, fontFamily) => {
                const isLast = fontIndex === groupedByFont.size;
                const prefix = isLast ? '└─' : '├─';

                outputChannel.appendLine(`│  ${prefix} Font: "${fontFamily}" (${occurrences.length} occurrence${occurrences.length > 1 ? 's' : ''})`);
                outputChannel.appendLine('│     │');
                outputChannel.appendLine('│     │  📍 Locations:');

                occurrences.forEach((occurrence, idx) => {
                    const locPrefix = idx === occurrences.length - 1 ? '└─' : '├─';
                    outputChannel.appendLine(`│     │     ${locPrefix} ${fileName}(${occurrence.line + 1},${occurrence.column + 1})`);
                });

                if (!isLast) {
                    outputChannel.appendLine('│     │');
                }

                fontIndex++;
            });

            outputChannel.appendLine('│');
            outputChannel.appendLine('');
            sectionIndex++;
        }

        // Section 2: Textboxes Without Font
        if (textboxesWithoutFont.length > 0) {
            outputChannel.appendLine(`┌─ [${sectionIndex}/${totalSections}] Textboxes Without Font Definition (${textboxesWithoutFont.length} occurrence${textboxesWithoutFont.length > 1 ? 's' : ''})`);
            outputChannel.appendLine('│');
            outputChannel.appendLine('│  📝 These textboxes have no <FontFamily> tag and default to Arial');
            outputChannel.appendLine('│     Segoe UI will be added automatically');
            outputChannel.appendLine('│');
            outputChannel.appendLine('│  📍 Locations:');

            textboxesWithoutFont.forEach((textbox, index) => {
                const prefix = index === textboxesWithoutFont.length - 1 ? '└─' : '├─';
                outputChannel.appendLine(`│     ${prefix} ${fileName}(${textbox.line + 1},${textbox.column + 1})`);
                outputChannel.appendLine(`│        <Style> tag without <FontFamily>`);
            });

            outputChannel.appendLine('│');
            outputChannel.appendLine('');
        }

        // Summary footer
        outputChannel.appendLine('─'.repeat(85));
        outputChannel.appendLine(`📊 SUMMARY: Found ${totalIssues} font issue(s)`);
        if (wrongFonts.length > 0) {
            const uniqueFonts = Array.from(new Set(wrongFonts.map(f => f.fontFamily)));
            outputChannel.appendLine(`   • ${wrongFonts.length} wrong font familie(s): ${uniqueFonts.join(', ')}`);
        }
        if (textboxesWithoutFont.length > 0) {
            outputChannel.appendLine(`   • ${textboxesWithoutFont.length} textbox(es) without font definition`);
        }
        outputChannel.appendLine('─'.repeat(85));
        outputChannel.appendLine('');
        outputChannel.appendLine('💡 TIP: Click on any file location above to jump directly to that line');

        outputChannel.show();
    }
}
