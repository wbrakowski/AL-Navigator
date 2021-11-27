import { DiagnosticCodes } from '../additional/diagnosticCodes';
import { TextDocument, Range, Diagnostic, languages, Uri, extensions } from 'vscode';
import * as semver from 'semver';

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
    public static checkDiagnosticsLanguage(d: Diagnostic): boolean {
        if (!d.source) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
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
}