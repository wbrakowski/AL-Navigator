import { DiagnosticCodes } from './diagnosticCodes';
import { TextDocument, Range, Diagnostic, languages, Uri, extensions } from 'vscode';
// import * as semver from 'semver';
import * as vscode from 'vscode';

export class DiagnosticAnalyzer {
    public constructor() {

    }
    // public getValidDiagnosticOfCurrentPositionToCreateProcedure(document: TextDocument, range: Range): Diagnostic[] {
    //     let diagnostics = languages.getDiagnostics(document.uri).filter(d => {
    //         let isAL = DiagnosticAnalyzer.checkDiagnosticsLanguage(d);
    //         let samePos = DiagnosticAnalyzer.checkDiagnosticsPosition(d, range);
    //         let validCode: boolean = DiagnosticAnalyzer.checkDiagnosticsCode(d);
    //         return isAL && samePos && validCode;
    //     });

    //     return diagnostics;
    // }

    public static getDiagnosticCode(d: Diagnostic): string {
        if ((d.code as any).value)
            return (d.code as any).value;
        else
            return d.code as string;
    }
    public static checkDiagnosticsCode(d: Diagnostic): boolean {
        if (!d.code) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in DiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(DiagnosticAnalyzer.getDiagnosticCode(d));
    }

    public static checkDiagnosticsPosition(d: Diagnostic, range: Range): boolean {
        return d.range.contains(range);
    }

    public static getRelevantDiagnosticOfCurrentPosition(range: vscode.Range, document: vscode.TextDocument | undefined) {
        if (!document) {
            return;
        }
        // let diagnostics = vscode.languages.getDiagnostics(this.document.uri);
        let diagnostics = vscode.languages.getDiagnostics(document.uri).filter(d => {
            //     let isAL = DiagnosticAnalyzer.checkDiagnosticsLanguage(d);
            let samePos = DiagnosticAnalyzer.checkDiagnosticsPosition(d, range);
            let validCode = DiagnosticAnalyzer.checkDiagnosticsCode(d);
            //     return isAL && samePos && validCode;
            return samePos && validCode;
        });

        return diagnostics.length >= 0 ? diagnostics[0] : undefined;
    }

    public static checkDiagnosticsLanguage(d: vscode.Diagnostic): boolean {
        if (!d.source) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }

}