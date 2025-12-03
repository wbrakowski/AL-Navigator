import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { ReportFontFixer } from './reportFontFixer';
import { RdlExpressionFixer } from './rdlExpressionFixer';
import { RdlcFileLocator } from '../al/report/rdlcFileLocator';

/**
 * Unified Report Analyzer
 * Analyzes report files for fonts, expressions, and dataset issues
 * Can be called from both AL files and RDL/RDLC files
 */
export class ReportAnalyzer {

    /**
     * Main entry point for report analysis
     * Determines the file type and runs appropriate analysis
     */
    public static async analyzeReport() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        const fileName = document.fileName.toLowerCase();

        // Determine file type
        if (fileName.endsWith('.rdl') || fileName.endsWith('.rdlc')) {
            // Called from RDL/RDLC file
            await this.analyzeFromRdlFile(document);
        } else if (fileName.endsWith('.al')) {
            // Called from AL file
            await this.analyzeFromAlFile(document);
        } else {
            vscode.window.showWarningMessage('This command only works with .al, .rdl, or .rdlc files.');
            return;
        }
    }

    /**
     * Analyze when called from an RDL/RDLC file
     */
    private static async analyzeFromRdlFile(document: vscode.TextDocument) {
        const rdlFilePath = document.uri.fsPath;
        const rdlFileName = path.basename(rdlFilePath);

        // Try to find the corresponding AL file
        const alFilePath = await this.findCorrespondingAlFile(rdlFilePath);

        // Show analysis options
        const analysisType = await this.promptForAnalysisType(true);
        if (!analysisType) {
            return; // User cancelled
        }

        await this.runAnalysis(analysisType, document, rdlFilePath, alFilePath);
    }

    /**
     * Analyze when called from an AL report file
     */
    private static async analyzeFromAlFile(document: vscode.TextDocument) {
        const alFilePath = document.uri.fsPath;
        const alContent = fs.readFileSync(alFilePath, 'utf8');

        // Check if this is a report file
        if (!this.isReportFile(alContent)) {
            vscode.window.showWarningMessage('This AL file does not appear to be a report or report extension.');
            return;
        }

        // Check if this is a report extension
        const baseReportName = this.getBaseReportName(alContent);
        let baseReportContent: string | undefined;

        if (baseReportName) {
            // This is a report extension - try to find the base report
            // First try workspace search, then use "Go to Definition" for dependencies
            let baseReportPath = await this.findBaseReportFile(baseReportName);
            let baseReportUri: vscode.Uri | undefined;

            if (baseReportPath) {
                baseReportUri = vscode.Uri.file(baseReportPath);
            } else {
                // Try "Go to Definition" for dependencies
                const baseReportInfo = await this.findBaseReportUsingDefinition(alFilePath, baseReportName);
                if (baseReportInfo) {
                    baseReportUri = baseReportInfo.uri;
                }
            }

            if (baseReportUri) {
                try {
                    const baseReportDoc = await vscode.workspace.openTextDocument(baseReportUri);
                    baseReportContent = baseReportDoc.getText();
                } catch (error) {
                    console.log(`Could not read base report "${baseReportName}": ${error.message}`);
                }
            }
        }

        // For processing-only check:
        // 1. If it's a report extension WITH its own layout, it's NOT processing-only
        // 2. If it's a report extension WITHOUT layout, check the base report
        // 3. If it's a regular report, check itself
        const extensionHasLayout = !this.isProcessingOnlyReport(alContent);

        if (baseReportName) {
            // This is a report extension
            if (!extensionHasLayout) {
                // Extension has no layout, check base report
                const baseIsProcessingOnly = baseReportContent ? this.isProcessingOnlyReport(baseReportContent) : false;

                if (baseIsProcessingOnly) {
                    vscode.window.showInformationMessage(
                        `This report extension extends "${baseReportName}" which is a processing-only report. The analyze report functionality is not available for processing-only reports and their extensions.`
                    );
                    return;
                }
            }
            // If extension has layout, continue with analysis
        } else {
            // Regular report - check if it's processing-only
            if (this.isProcessingOnlyReport(alContent)) {
                vscode.window.showInformationMessage(
                    'This is a processing-only report. The analyze report functionality is not available for processing-only reports.'
                );
                return;
            }
        }

        // Find all RDL/RDLC files referenced in the AL file
        let rdlcFilePaths: string[] = [];
        try {
            rdlcFilePaths = RdlcFileLocator.parseALFileForRDLCLayouts(alContent, alFilePath);
        } catch (error) {
            vscode.window.showErrorMessage(`Error parsing AL file for layouts: ${error.message}`);
            return;
        }

        if (rdlcFilePaths.length === 0) {
            vscode.window.showErrorMessage('No RDL/RDLC layout files found in the AL report file. Make sure the report has RDLCLayout or rendering section with LayoutFile properties.');
            return;
        }

        // Filter out non-existent files and show which ones were found
        const existingLayouts = rdlcFilePaths.filter(p => {
            const exists = fs.existsSync(p);
            if (!exists) {
                console.log(`Layout file not found: ${p}`);
            }
            return exists;
        });

        if (existingLayouts.length === 0) {
            const layoutPaths = rdlcFilePaths.map(p => `\n  - ${p}`).join('');
            vscode.window.showErrorMessage(`Layout file(s) not found. Searched for:${layoutPaths}\n\nMake sure the layout files exist at these locations.`);
            return;
        }

        // If multiple layouts, let user choose
        let selectedRdlPath: string;
        if (existingLayouts.length > 1) {
            const layoutOptions = existingLayouts.map(p => ({
                label: path.basename(p),
                description: path.dirname(p),
                filePath: p
            }));

            const selected = await vscode.window.showQuickPick(layoutOptions, {
                placeHolder: 'Multiple layouts found. Select which one to analyze:'
            });

            if (!selected) {
                return; // User cancelled
            }
            selectedRdlPath = selected.filePath;
        } else {
            selectedRdlPath = existingLayouts[0];
        }

        // Open the RDL file to get its document
        const rdlDocument = await vscode.workspace.openTextDocument(selectedRdlPath);

        // Show analysis options
        const analysisType = await this.promptForAnalysisType(false);
        if (!analysisType) {
            return; // User cancelled
        }

        await this.runAnalysis(analysisType, rdlDocument, selectedRdlPath, alFilePath);
    }

    /**
     * Prompt user to select which type of analysis to run
     */
    private static async promptForAnalysisType(isRdlFile: boolean): Promise<string | undefined> {
        interface AnalysisOption {
            label: string;
            description: string;
            detail: string;
            id: string;
        }

        const options: AnalysisOption[] = [
            {
                label: '$(eye) Analyze All',
                description: 'Run all analyses',
                detail: 'Check fonts, expressions, and dataset variables',
                id: 'all'
            },
            {
                label: '$(symbol-color) Analyze Report Fonts',
                description: 'Find non-Segoe UI fonts',
                detail: 'Detects fonts that should be replaced (preserves barcode fonts)',
                id: 'fonts'
            },
            {
                label: '$(symbol-keyword) Analyze Expression Irregularities',
                description: 'Find irregular RDL expressions',
                detail: 'Detects common errors like Code.GetData without parameters',
                id: 'expressions'
            }
        ];

        // Only show dataset analysis if we can work with AL file
        if (!isRdlFile || await this.canFindAlFile()) {
            options.push({
                label: '$(database) Analyze Dataset Variables',
                description: 'Find unused variables and missing fields',
                detail: 'Shows which AL dataset fields are used/unused in the layout',
                id: 'dataset'
            });
        }

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select analysis type:'
        });

        return selected?.id;
    }

    /**
     * Run the selected analysis
     */
    private static async runAnalysis(
        analysisType: string,
        rdlDocument: vscode.TextDocument,
        rdlFilePath: string,
        alFilePath?: string
    ) {
        const results: AnalysisResult[] = [];

        // Run requested analyses
        if (analysisType === 'all' || analysisType === 'fonts') {
            const fontResult = await this.analyzeFonts(rdlDocument);
            results.push(fontResult);
        }

        if (analysisType === 'all' || analysisType === 'expressions') {
            const expressionResult = await this.analyzeExpressions(rdlDocument);
            results.push(expressionResult);
        }

        if (analysisType === 'all' || analysisType === 'dataset') {
            if (alFilePath && fs.existsSync(alFilePath)) {
                const datasetResult = await this.analyzeDataset(rdlDocument, rdlFilePath, alFilePath);
                results.push(datasetResult);
            } else {
                vscode.window.showWarningMessage('Cannot analyze dataset: AL file not found.');
            }
        }

        // Show results
        await this.showResults(results, rdlDocument, rdlFilePath, alFilePath);
    }

    /**
     * Analyze fonts in the report
     */
    private static async analyzeFonts(document: vscode.TextDocument): Promise<AnalysisResult> {
        const wrongFonts = ReportFontFixer.findWrongFonts(document);

        return {
            type: 'fonts',
            title: 'Font Analysis',
            issueCount: wrongFonts.length,
            issues: wrongFonts.map(f => ({
                message: `Line ${f.line + 1}: Font "${f.fontFamily}" should be Segoe UI`,
                severity: 'warning',
                data: f
            })),
            canAutoFix: wrongFonts.length > 0
        };
    }

    /**
     * Analyze expressions in the report
     */
    private static async analyzeExpressions(document: vscode.TextDocument): Promise<AnalysisResult> {
        const irregularExpressions = RdlExpressionFixer.findIrregularExpressions(document);

        return {
            type: 'expressions',
            title: 'Expression Analysis',
            issueCount: irregularExpressions.length,
            issues: irregularExpressions.map(e => ({
                message: `Line ${e.line + 1}: ${e.pattern} - ${e.match}`,
                severity: 'error',
                data: e
            })),
            canAutoFix: irregularExpressions.length > 0
        };
    }

    /**
     * Analyze dataset variables
     */
    private static async analyzeDataset(
        rdlDocument: vscode.TextDocument,
        rdlFilePath: string,
        alFilePath: string
    ): Promise<AnalysisResult> {
        try {
            const rdlContent = fs.readFileSync(rdlFilePath, 'utf8');
            const alContent = fs.readFileSync(alFilePath, 'utf8');

            const parser = new xml2js.Parser({ explicitArray: false });
            const rdlObject = await parser.parseStringPromise(rdlContent);

            // Extract used fields from RDL
            const usedFields = this.extractUsedFieldsFromRdl(rdlObject);

            // Extract defined fields from AL
            // If this is a report extension, also include fields from the base report
            let definedFields = this.extractDefinedFieldsFromAl(alContent);

            const baseReportName = this.getBaseReportName(alContent);

            if (baseReportName) {
                // This is a report extension - also get fields from base report
                // First try workspace search, then use "Go to Definition" for dependencies
                let baseReportPath = await this.findBaseReportFile(baseReportName);
                let baseReportUri: vscode.Uri | undefined;

                if (baseReportPath) {
                    baseReportUri = vscode.Uri.file(baseReportPath);
                } else {
                    const baseReportInfo = await this.findBaseReportUsingDefinition(alFilePath, baseReportName);
                    if (baseReportInfo) {
                        baseReportUri = baseReportInfo.uri;
                        baseReportPath = baseReportInfo.displayPath;
                    }
                }

                if (!baseReportUri) {
                    // Cannot analyze report extension without base report
                    throw new Error(`Cannot analyze report extension: Base report "${baseReportName}" not found. The dataset analysis requires access to the base report to provide accurate results.`);
                }

                // Read the base report content
                // Use VS Code's document API to handle both .al and .dal files
                let baseReportContent: string;
                try {
                    const baseReportDoc = await vscode.workspace.openTextDocument(baseReportUri);
                    baseReportContent = baseReportDoc.getText();
                } catch (error) {
                    throw new Error(`Cannot read base report "${baseReportName}" at ${baseReportPath}. Error: ${error.message}`);
                }

                if (baseReportContent) {
                    const baseFields = this.extractDefinedFieldsFromAl(baseReportContent);

                    // Merge fields from base report and extension (remove duplicates)
                    const allFields = new Set([...definedFields, ...baseFields]);
                    definedFields = Array.from(allFields);
                }
            }

            // Find unused fields (defined in AL but not used in RDL)
            const unusedFields: string[] = [];
            definedFields.forEach(field => {
                if (!usedFields.has(field.toLowerCase())) {
                    unusedFields.push(field);
                }
            });

            // Find missing fields (used in RDL but not defined in AL)
            const missingFields: string[] = [];
            usedFields.forEach(field => {
                const fieldLower = field.toLowerCase();
                const isDefined = definedFields.some(df => df.toLowerCase() === fieldLower);
                if (!isDefined) {
                    missingFields.push(field);
                }
            });

            const issues: AnalysisIssue[] = [];

            unusedFields.forEach(field => {
                issues.push({
                    message: `Unused in layout: column "${field}"`,
                    severity: 'info',
                    data: { field, type: 'unused' }
                });
            });

            missingFields.forEach(field => {
                issues.push({
                    message: `Missing in AL dataset: Fields!${field}`,
                    severity: 'error',
                    data: { field, type: 'missing' }
                });
            });

            issues.push({
                message: `Total fields defined in AL: ${definedFields.length}`,
                severity: 'info',
                data: { type: 'summary' }
            });

            issues.push({
                message: `Total fields used in layout: ${usedFields.size}`,
                severity: 'info',
                data: { type: 'summary' }
            });

            return {
                type: 'dataset',
                title: 'Dataset Analysis',
                issueCount: unusedFields.length + missingFields.length,
                issues: issues,
                canAutoFix: unusedFields.length > 0 || missingFields.length > 0,
                metadata: {
                    unusedFields,
                    missingFields,
                    totalDefined: definedFields.length,
                    totalUsed: usedFields.size
                }
            };

        } catch (error) {
            return {
                type: 'dataset',
                title: 'Dataset Analysis',
                issueCount: 0,
                issues: [{
                    message: `Error analyzing dataset: ${error.message}`,
                    severity: 'error',
                    data: {}
                }],
                canAutoFix: false
            };
        }
    }

    /**
     * Extract fields used in RDL file
     */
    private static extractUsedFieldsFromRdl(rdlObject: any): Set<string> {
        const usedFields = new Set<string>();

        function traverseObject(obj: any) {
            if (typeof obj === 'object') {
                for (const key in obj) {
                    const value = obj[key];
                    if (typeof value === 'string') {
                        const matches = value.match(/Fields!([a-zA-Z0-9_]+)(?:\.Value|Format)?/g);
                        if (matches) {
                            matches.forEach((match) => {
                                const fieldName = match.replace(/Fields!|\.Value|Format/g, '').trim().toLowerCase();
                                usedFields.add(fieldName);
                            });
                        }
                    } else if (typeof value === 'object') {
                        traverseObject(value);
                    }
                }
            }
        }

        if (rdlObject.Report) {
            traverseObject(rdlObject.Report);
        }

        return usedFields;
    }

    /**
     * Extract fields defined in AL file
     */
    private static extractDefinedFieldsFromAl(alContent: string): string[] {
        const definedFields: string[] = [];
        const columnRegex = /column\(([^;]+);/g;
        let match;

        while ((match = columnRegex.exec(alContent)) !== null) {
            const columnName = match[1].trim();
            definedFields.push(columnName);
        }

        return definedFields;
    }

    /**
     * Show analysis results to the user
     */
    private static async showResults(
        results: AnalysisResult[],
        rdlDocument: vscode.TextDocument,
        rdlFilePath: string,
        alFilePath?: string
    ) {
        // Calculate totals
        const totalIssues = results.reduce((sum, r) => sum + r.issueCount, 0);

        if (totalIssues === 0) {
            vscode.window.showInformationMessage('✅ Report analysis complete: No issues found!');
            return;
        }

        // Build results message
        let message = `📊 Report Analysis Results\n\n`;
        results.forEach(result => {
            message += `${result.title}: ${result.issueCount} issue(s)\n`;
        });

        // Create output channel for detailed results
        const outputChannel = vscode.window.createOutputChannel('Report Analysis');
        outputChannel.clear();
        outputChannel.appendLine('═══════════════════════════════════════════════════════');
        outputChannel.appendLine('  REPORT ANALYSIS RESULTS');
        outputChannel.appendLine('═══════════════════════════════════════════════════════');
        outputChannel.appendLine('');
        outputChannel.appendLine(`Report File: ${path.basename(rdlFilePath)}`);
        if (alFilePath) {
            outputChannel.appendLine(`AL File: ${path.basename(alFilePath)}`);
        }
        outputChannel.appendLine('');

        results.forEach(result => {
            outputChannel.appendLine(`\n━━━ ${result.title} ━━━`);
            outputChannel.appendLine(`Issues found: ${result.issueCount}`);
            outputChannel.appendLine('');

            if (result.issues.length > 0) {
                result.issues.forEach(issue => {
                    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                    outputChannel.appendLine(`${icon} ${issue.message}`);
                });
            } else {
                outputChannel.appendLine('✅ No issues found');
            }

            // Add metadata if available
            if (result.metadata) {
                outputChannel.appendLine('');
                if (result.metadata.unusedFields && result.metadata.unusedFields.length > 0) {
                    outputChannel.appendLine(`\nUnused Fields (${result.metadata.unusedFields.length}):`);
                    result.metadata.unusedFields.forEach(f => outputChannel.appendLine(`  - ${f}`));
                }
                if (result.metadata.missingFields && result.metadata.missingFields.length > 0) {
                    outputChannel.appendLine(`\nMissing Fields (${result.metadata.missingFields.length}):`);
                    result.metadata.missingFields.forEach(f => outputChannel.appendLine(`  - Fields!${f}`));
                }
            }
        });

        outputChannel.appendLine('\n═══════════════════════════════════════════════════════');
        outputChannel.show();

        // Ask if user wants to fix issues
        const canAutoFix = results.some(r => r.canAutoFix);
        if (canAutoFix) {
            const action = await vscode.window.showInformationMessage(
                `Found ${totalIssues} issue(s). View details in 'Report Analysis' output panel.`,
                'Fix Issues',
                'Close'
            );

            if (action === 'Fix Issues') {
                await this.fixIssues(results, rdlDocument, rdlFilePath, alFilePath);
            }
        } else {
            vscode.window.showInformationMessage(
                `Found ${totalIssues} issue(s). View details in 'Report Analysis' output panel.`
            );
        }
    }

    /**
     * Fix issues found during analysis
     */
    private static async fixIssues(
        results: AnalysisResult[],
        rdlDocument: vscode.TextDocument,
        rdlFilePath: string,
        alFilePath?: string
    ) {
        const fixOptions: vscode.QuickPickItem[] = [];

        results.forEach(result => {
            if (result.canAutoFix && result.issueCount > 0) {
                let label = '';
                let description = '';

                switch (result.type) {
                    case 'fonts':
                        label = '$(symbol-color) Fix Font Issues';
                        description = `Replace ${result.issueCount} font(s) with Segoe UI`;
                        break;
                    case 'expressions':
                        label = '$(symbol-keyword) Fix Expression Issues';
                        description = `Fix ${result.issueCount} irregular expression(s)`;
                        break;
                    case 'dataset':
                        const unusedCount = result.metadata?.unusedFields?.length || 0;
                        const missingCount = result.metadata?.missingFields?.length || 0;

                        if (unusedCount > 0) {
                            fixOptions.push({
                                label: '$(trash) Remove Unused Dataset Variables',
                                description: `Remove ${unusedCount} unused field(s) from AL`,
                                detail: 'dataset-unused'
                            });
                        }

                        if (missingCount > 0) {
                            fixOptions.push({
                                label: '$(add) Add Missing Fields to AL Dataset',
                                description: `Add ${missingCount} missing field(s) to AL report`,
                                detail: 'dataset-missing'
                            });
                        }
                        return; // Skip default push below
                }

                if (result.type !== 'dataset') {
                    fixOptions.push({ label, description, detail: result.type });
                }
            }
        });

        if (fixOptions.length === 0) {
            vscode.window.showInformationMessage('No auto-fixable issues found.');
            return;
        }

        const selected = await vscode.window.showQuickPick(fixOptions, {
            placeHolder: 'Select which issues to fix:',
            canPickMany: true
        });

        if (!selected || selected.length === 0) {
            return;
        }

        // Apply fixes
        for (const option of selected) {
            const fixType = option.detail;

            switch (fixType) {
                case 'fonts':
                    await ReportFontFixer.findAndReplaceFonts(rdlDocument);
                    vscode.window.showInformationMessage('✅ Fonts replaced successfully');
                    break;

                case 'expressions':
                    await RdlExpressionFixer.findAndReplaceExpressions(rdlDocument);
                    vscode.window.showInformationMessage('✅ Expressions fixed successfully');
                    break;

                case 'dataset-unused':
                    if (alFilePath) {
                        await this.removeUnusedVariables(rdlFilePath, alFilePath);
                    }
                    break;

                case 'dataset-missing':
                    if (alFilePath) {
                        const datasetResult = results.find(r => r.type === 'dataset');
                        if (datasetResult?.metadata?.missingFields) {
                            await this.addMissingFieldsToDataset(alFilePath, datasetResult.metadata.missingFields);
                        }
                    }
                    break;
            }
        }
    }

    /**
     * Remove unused variables from AL file
     */
    private static async removeUnusedVariables(rdlFilePath: string, alFilePath: string) {
        try {
            const rdlContent = fs.readFileSync(rdlFilePath, 'utf8');
            const alContent = fs.readFileSync(alFilePath, 'utf8');

            const parser = new xml2js.Parser({ explicitArray: false });
            const rdlObject = await parser.parseStringPromise(rdlContent);

            const usedFields = this.extractUsedFieldsFromRdl(rdlObject);
            const removedVariables: string[] = [];

            const updatedALContent = alContent.replace(
                /column\(([\s\S]*?);[\s\S]*?\)\s*{[\s\S]*?}/g,
                (match, variable) => {
                    const normalizedVariable = String(variable).trim().toLowerCase();
                    if (!usedFields.has(normalizedVariable)) {
                        removedVariables.push(variable);
                        return ''; // Remove the column
                    }
                    return match; // Keep the column
                }
            );

            if (updatedALContent !== alContent) {
                fs.writeFileSync(alFilePath, updatedALContent);

                let message = `✅ Removed ${removedVariables.length} unused variable(s) from AL file`;
                if (removedVariables.length > 0) {
                    message += ':\n' + removedVariables.map(v => `  - ${v}`).join('\n');
                    message += '\n\nThe layout file will be updated after rebuilding.';
                }
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showInformationMessage('No unused variables to remove.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error removing unused variables: ${error.message}`);
        }
    }

    /**
     * Add missing fields to AL dataset
     */
    private static async addMissingFieldsToDataset(alFilePath: string, missingFields: string[]) {
        try {
            const alContent = fs.readFileSync(alFilePath, 'utf8');

            // Find the last column definition in the last dataitem
            // We'll add the missing columns at the end of the last dataitem
            const dataitemRegex = /dataitem\s*\([^)]+\)\s*{[\s\S]*?}/gi;
            let lastDataitemMatch: RegExpExecArray | null = null;
            let match: RegExpExecArray | null;

            // Find the last dataitem
            while ((match = dataitemRegex.exec(alContent)) !== null) {
                lastDataitemMatch = match;
            }

            if (!lastDataitemMatch) {
                vscode.window.showErrorMessage('Could not find a dataitem in the AL file to add fields to.');
                return;
            }

            const dataitemContent = lastDataitemMatch[0];
            const dataitemStartIndex = lastDataitemMatch.index;

            // Find the last closing brace of a column within this dataitem
            const columnRegex = /column\s*\([^)]+\)\s*{[^}]*}/g;
            let lastColumnMatch: RegExpExecArray | null = null;
            let columnMatch: RegExpExecArray | null;

            while ((columnMatch = columnRegex.exec(dataitemContent)) !== null) {
                lastColumnMatch = columnMatch;
            }

            let insertPosition: number;
            let indentation: string = '                '; // Default indentation

            if (lastColumnMatch) {
                // Insert after the last column
                insertPosition = dataitemStartIndex + lastColumnMatch.index + lastColumnMatch[0].length;

                // Try to detect indentation from the last column
                const lastColumnLine = dataitemContent.substring(0, lastColumnMatch.index).split('\n').pop() || '';
                const indentMatch = lastColumnLine.match(/^(\s*)/);
                if (indentMatch) {
                    indentation = indentMatch[1];
                }
            } else {
                // No columns found, insert before the closing brace of the dataitem
                const closingBraceIndex = dataitemContent.lastIndexOf('}');
                if (closingBraceIndex === -1) {
                    vscode.window.showErrorMessage('Could not find proper insertion point in the dataitem.');
                    return;
                }
                insertPosition = dataitemStartIndex + closingBraceIndex;
            }

            // Build the columns to insert
            const columnsToAdd = missingFields.map(field => {
                // Create a simple column definition
                // Note: The user will need to set the correct source field
                return `\n${indentation}column(${field}; ${field})\n${indentation}{\n${indentation}}\n`;
            }).join('');

            // Insert the columns
            const updatedContent = alContent.substring(0, insertPosition) + columnsToAdd + alContent.substring(insertPosition);

            // Write the file
            fs.writeFileSync(alFilePath, updatedContent);

            vscode.window.showInformationMessage(
                `✅ Added ${missingFields.length} field(s) to AL dataset:\n${missingFields.map(f => `  - ${f}`).join('\n')}\n\n⚠️ Note: Please review and set the correct source fields for the new columns.`
            );

            // Open the AL file to show the changes
            const document = await vscode.workspace.openTextDocument(alFilePath);
            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Error adding missing fields: ${error.message}`);
        }
    }

    /**
     * Helper: Check if AL content is a report or report extension file
     */
    private static isReportFile(alContent: string): boolean {
        return /^\s*(report|reportextension)\s+\d+/mi.test(alContent);
    }

    /**
     * Helper: Check if report is processing-only (no visual layout)
     * Processing-only reports have ProcessingOnly = true or no RenderingSection/RDLCLayout
     */
    private static isProcessingOnlyReport(alContent: string): boolean {
        // Check for explicit ProcessingOnly = true
        if (/ProcessingOnly\s*=\s*true/mi.test(alContent)) {
            return true;
        }

        // Check if there's no rendering section and no RDLCLayout
        const hasRenderingSection = /rendering\s*\{/mi.test(alContent);
        const hasRDLCLayout = /RDLCLayout\s*=/mi.test(alContent);
        const hasWordLayout = /WordLayout\s*=/mi.test(alContent);
        const hasExcelLayout = /ExcelLayout\s*=/mi.test(alContent);

        // If none of these layout properties exist, it's processing-only
        return !hasRenderingSection && !hasRDLCLayout && !hasWordLayout && !hasExcelLayout;
    }

    /**
     * Helper: Extract base report name from report extension
     * Parses: reportextension 50100 "MyExt" extends "BaseReport"
     * Returns: "BaseReport" or undefined if not a report extension
     */
    private static getBaseReportName(alContent: string): string | undefined {
        const match = /reportextension\s+\d+\s+"[^"]*"\s+extends\s+"([^"]*)"/mi.exec(alContent);
        return match ? match[1] : undefined;
    }

    /**
     * Helper: Find base report AL file in workspace by report name
     */
    private static async findBaseReportFile(reportName: string): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        // Search for all AL files in workspace
        const alFiles = await vscode.workspace.findFiles('**/*.al', '**/node_modules/**');

        for (const file of alFiles) {
            try {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                // Match: report 50100 "ReportName"
                const reportMatch = new RegExp(`^\\s*report\\s+\\d+\\s+"${reportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'mi');
                if (reportMatch.test(content)) {
                    return file.fsPath;
                }
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        return undefined;
    }

    /**
     * Helper: Find base report using VS Code's "Go to Definition" functionality
     * This works for reports in dependencies/symbol files, not just the workspace
     * Returns an object with both the Uri (for opening) and a display path
     */
    private static async findBaseReportUsingDefinition(alFilePath: string, baseReportName: string): Promise<{ uri: vscode.Uri, displayPath: string } | undefined> {
        try {
            // Open the report extension file
            const document = await vscode.workspace.openTextDocument(alFilePath);
            const content = document.getText();

            // Find the position of the base report name in the "extends" clause
            // Pattern: reportextension 60004 "MyExt" extends "BaseReportName"
            const extendsPattern = new RegExp(`extends\\s+"${baseReportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
            const match = extendsPattern.exec(content);

            if (!match) {
                return undefined;
            }

            // Find the position of the report name within the extends clause
            const matchPosition = match.index + match[0].indexOf('"') + 1; // Position after the opening quote
            const position = document.positionAt(matchPosition);

            // Execute "Go to Definition" command
            const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeDefinitionProvider',
                document.uri,
                position
            );

            if (definitions && definitions.length > 0) {
                const definitionUri = definitions[0].uri;
                // Return both the Uri (for opening documents) and a display path
                return {
                    uri: definitionUri,
                    displayPath: definitionUri.fsPath || definitionUri.toString()
                };
            }

            return undefined;
        } catch (error) {
            console.error(`Error finding base report using definition: ${error}`);
            return undefined;
        }
    }

    /**
     * Helper: Try to find corresponding AL file for an RDL file
     */
    private static async findCorrespondingAlFile(rdlFilePath: string): Promise<string | undefined> {
        const rdlBaseName = path.basename(rdlFilePath, path.extname(rdlFilePath));
        const rdlDir = path.dirname(rdlFilePath);

        // Search in the same directory and parent directories
        const searchPaths = [
            rdlDir,
            path.join(rdlDir, '..'),
            path.join(rdlDir, '..', '..'),
        ];

        for (const searchPath of searchPaths) {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(searchPath, '**/*.al')
            );

            for (const file of files) {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                // Check if this AL file references our RDL file
                if (content.includes(path.basename(rdlFilePath)) ||
                    content.includes(rdlBaseName)) {
                    return file.fsPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Helper: Check if we can potentially find an AL file
     */
    private static async canFindAlFile(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        const alFiles = await vscode.workspace.findFiles('**/*.al', '**/node_modules/**', 1);
        return alFiles.length > 0;
    }
}

/**
 * Type definitions
 */
interface AnalysisResult {
    type: string;
    title: string;
    issueCount: number;
    issues: AnalysisIssue[];
    canAutoFix: boolean;
    metadata?: {
        unusedFields?: string[];
        missingFields?: string[];
        totalDefined?: number;
        totalUsed?: number;
    };
}

interface AnalysisIssue {
    message: string;
    severity: 'error' | 'warning' | 'info';
    data: any;
}
