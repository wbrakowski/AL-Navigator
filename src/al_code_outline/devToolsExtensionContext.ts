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

        let tsir = new ToolsSymbolInformationRequest(undefined, false);
        let response;

        switch (objectType) {
            case ObjectTypes.table:
                response = await azALDevTools.toolsLangServerClient.getTablesList(tsir);
                break;
            case ObjectTypes.codeunit:
                response = await azALDevTools.toolsLangServerClient.getCodeunitsList(tsir);
                break;
            case ObjectTypes.page:
                response = await azALDevTools.toolsLangServerClient.getPagesList(tsir);
                break;
            case ObjectTypes.report:
                response = await azALDevTools.toolsLangServerClient.getReportsList(tsir);
                break;
            case ObjectTypes.query:
                response = await azALDevTools.toolsLangServerClient.getQueriesList(tsir);
                break;
            case ObjectTypes.xmlport:
                response = await azALDevTools.toolsLangServerClient.getXmlPortsList(tsir);
                break;
            case ObjectTypes.enum:
                response = await azALDevTools.toolsLangServerClient.getEnumsList(tsir);
                break;
            case ObjectTypes.controlAddIn:
                // response = await azALDevTools.toolsLangServerClient.getControlAddInsList(tir);
                break;
            case ObjectTypes.interface:
                response = await azALDevTools.toolsLangServerClient.getInterfacesList(tsir);
                break;
        }
        if (!response) {
            return [];
        }

        let objectList: string[] = [];
        if ((response) && (response.symbols)) {
            for (let i = 0; i < response.symbols.length; i++) {
                let name = response.symbols[i].name;
                if (name)
                    objectList.push(name);
            }
        }
        return objectList;
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