// Thanks to David Feldhoff for this chunk of code

// TODO All of this ;-)

import * as vscode from 'vscode';
import * as path from 'path';
import { isNullOrUndefined } from "util";
import { ObjectTypes } from './objectTypes';
import { StringFunctions } from './stringFunctions';

export class ALCodeOutlineExtension {
    private static alCodeOutlineExtensionObject: ALCodeOutlineExtension;
    private alCodeOutlineExtension: any;
    private constructor(alCodeOutlineExtension: vscode.Extension<any>) {
        this.alCodeOutlineExtension = alCodeOutlineExtension;
    }

    public static async getInstance(): Promise<ALCodeOutlineExtension> {
        if (isNullOrUndefined(this.alCodeOutlineExtensionObject)) {
            this.setInstance();
        }
        await this.alCodeOutlineExtensionObject.activate();
        return this.alCodeOutlineExtensionObject;
    }

    private static setInstance() {
        let vsCodeExtension = vscode.extensions.getExtension('andrzejzwierzchowski.al-code-outline');
        if (isNullOrUndefined(vsCodeExtension)) {
            throw new Error('AL Code Outline has to be installed.');
        }
        this.alCodeOutlineExtensionObject = new ALCodeOutlineExtension(vsCodeExtension as vscode.Extension<any>);
    }

    private async activate() {
        if (!this.alCodeOutlineExtension.isActive) {
            await this.alCodeOutlineExtension.activate();
        }
    }

    public getAPI() {
        return this.alCodeOutlineExtension.exports;
    }

    // public static async getFirstObjectSymbolOfDocumentUri(documentUri: vscode.Uri): Promise<any> {
    //     let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
    //     let symbolsLibraryCalledObject: any = await azalDevTools.symbolsService.loadDocumentSymbols(documentUri);
    //     return symbolsLibraryCalledObject.rootSymbol.findFirstObjectSymbol();
    // }

    // public static async getVarSymbolOfCurrentLine(documentUri: vscode.Uri, currentLine: number): Promise<any> {
    //     let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
    //     let symbolsLibrary = await azALDevTools.symbolsService.loadDocumentSymbols(documentUri);
    //     if (symbolsLibrary.rootSymbol) {
    //         let objectSymbol = symbolsLibrary.rootSymbol.findFirstObjectSymbol();
    //         let varKinds: number[] = this.getUndefinedKinds();
    //         for (let x = 0; x < varKinds.length; x++) {
    //             let objectsOfKindX: any[] = [];
    //             objectSymbol.collectChildSymbols(varKinds[x], true, objectsOfKindX);
    //             if (objectsOfKindX && objectsOfKindX.length > 0) {
    //                 for (let i = 0; i < objectsOfKindX.length; i++) {
    //                     if (objectsOfKindX[i].range.start.line <= currentLine && objectsOfKindX[i].range.end.line >= currentLine) {
    //                         return objectsOfKindX[i];
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     // TODO
    //     // throw new Error("The current procedurename was not found starting at line " + currentLine + " in file " + path.basename(documentUri.fsPath) + ".");
    //     throw new Error("Problem my friend " + currentLine + " in file " + path.basename(documentUri.fsPath) + ".");
    // }
    public static isSymbolKindProcedureOrTrigger(kind: number): boolean {
        return this.getProcedureOrTriggerKinds().includes(kind);
    }
    public static isSymbolKindVariableOrParameter(kind: number): boolean {
        switch (kind) {
            case 240:   //Parameter
            case 241:   //Variable
                return true;
            default:
                return false;
        }
    }
    public static isSymbolKindVariable(kind: number): boolean {
        switch (kind) {
            case 241:   //Variable
                return true;
            default:
                return false;
        }
    }
    public static isSymbolKindTable(kind: number): boolean {
        return kind === 412;
    }
    public static isSymbolKindTableExtension(kind: number): boolean {
        return kind === 413;
    }
    static isSymbolKindPage(kind: number): boolean {
        return kind === 414;
    }
    static isSymbolKindPageExtension(kind: number): boolean {
        return kind === 415;
    }
    static isSymbolKindPageCustomization(kind: number): boolean {
        return kind === 421;
    }
    static isSymbolKindReport(kind: number): boolean {
        return kind === 416;
    }
    public static isSymbolKindTableField(kind: number): boolean {
        switch (kind) {
            case 260:   //TableField
                return true;
            default:
                return false;
        }
    }
    private static getProcedureOrTriggerKinds(): number[] {
        let kinds: number[] = [];
        kinds.push(236); //TriggerDeclaration
        kinds.push(237); //EventTriggerDeclaration
        kinds.push(238); //MethodDeclaration
        kinds.push(239); //EventDeclaration
        kinds.push(50001); //LocalMethodDeclaration
        kinds.push(50037); //EventSubscriber
        return kinds;
    }

    private static getVarKinds(): number[] {
        let kinds: number[] = [];
        kinds.push(241); //EventSubscriber
        return kinds;
    }

    public static async getObjectList(objectType: string) : Promise<string[]> {
        let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let fileContent: string = "";
        switch (objectType) {
            case ObjectTypes.table:
                //  return azALDevTools.alLangProxy.getTableList(undefined);
                 fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:record ;\nbegin\nend;\n}";
                 break;
            case ObjectTypes.codeunit:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:codeunit ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.page:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:page ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.report:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:report ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.query:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:query ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.xmlport:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:xmlport ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.enum:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:enum ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.controlAddIn:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:controladdin ;\nbegin\nend;\n}";
                break;
            case ObjectTypes.interface:
                fileContent = "codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:interface ;\nbegin\nend;\n}";
                break;
        }
        if (!fileContent) {
            return [];
        }
        // let fileContent = `codeunit 0 _symbolcache\n{\nprocedure t()\nvar\nf:${objectType} ;\nbegin\nend;\n}`;
        let list: any;
        if (objectType === ObjectTypes.table) {
            // list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, `AL Navigator: Collecting list of object type: ${objectType}.`, fileContent, 4, 9, 7, 1);
            list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, "", fileContent, 4, 9, 7, 1);
        }
        else {
            // list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, `AL Navigator: Collecting list of object type: ${objectType}.`, fileContent, 4, 7, 7, 1);
            list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, "", fileContent, 4, 7, 7, 1);
        }
        
        //process results
        let out : string[] = [];
        
        if (list && list.items) {
            for (let i=0; i<list.items.length; i++) {
                let item = list.items[i];
                switch (objectType) {
                    case ObjectTypes.enum:
                    case ObjectTypes.controlAddIn:
                    case ObjectTypes.report:
                    case ObjectTypes.xmlport:
                    case ObjectTypes.interface:
                    case ObjectTypes.query:
                        if (item.kind === vscode.CompletionItemKind.Reference) { 
                            out.push(StringFunctions.fromNameText(item.label));
                        }
                        break;
                    default:
                        if (item.kind === vscode.CompletionItemKind.Class) { 
                            out.push(StringFunctions.fromNameText(item.label));
                        }
                        break;
                }
                
            }
        }
        return out;
    }
}