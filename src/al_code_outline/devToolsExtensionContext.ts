// Thanks to David Feldhoff for this chunk of code

import * as vscode from 'vscode';
import { isNullOrUndefined } from "util";
import { ObjectTypes } from '../al/objectTypes';
import { StringFunctions } from '../additional/stringFunctions';
import { ToolsSymbolInformationRequest } from './toolsSymbolInformationRequest';
import { SymbolWithNameInformation } from './smbolWithNameInformation';
import { ALDataTypes } from '../al/alDataTypes';

export class ALCodeOutlineExtension {
    public alCodeOutlineExtensionObject: any;
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

    public static isSymbolKindProcedureOrTrigger(kind: number): boolean {
        return this.getProcedureOrTriggerKinds().includes(kind);
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

    public static async getObjectList(objectType: string): Promise<string[]> {
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
        let list: any;
        if (objectType === ObjectTypes.table) {
            list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, "", fileContent, 4, 9, 7, 1);
        }
        else {
            list = await azALDevTools.alLangProxy.getCompletionForSourceCode(undefined, "", fileContent, 4, 7, 7, 1);
        }

        //process results
        let out: string[] = [];

        if (list && list.items) {
            for (let i = 0; i < list.items.length; i++) {
                let item = list.items[i];
                switch (objectType) {
                    case ObjectTypes.enum:
                        if (item.kind === vscode.CompletionItemKind.Enum) {
                            out.push(StringFunctions.fromNameText(item.label));
                        }
                        break;
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

    public static async getReportList(): Promise<string[]> {
        let reportList: string[] = [];
        let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let response = azALDevTools.toolsLangServerClient.getReportsList(new ToolsSymbolInformationRequest('', false));
        if (response)
            reportList = SymbolWithNameInformation.toNamesList(response.symbols);

        if ((reportList) && (reportList.length > 0)) {
            // this.sendMessage({
            //     command : "setReports",
            //     data : this._reportExtWizardData.reportList
            // });
        }
        return reportList;
    }

    public static async getFirstSuggestedReportId(): Promise<number> {
        let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let objId = await azALDevTools.idReservationService.suggestObjectId(undefined, undefined, ALDataTypes.Report);
        return objId;
    }
}