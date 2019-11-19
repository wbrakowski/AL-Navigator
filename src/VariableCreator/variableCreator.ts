import { workspace, ExtensionContext, commands, window, Selection, Range, Position } from 'vscode';
import { ALVariable } from './alVariable';

export class VariableCreator {
    private _alVariables : ALVariable[]; 

    constructor() {
        this._alVariables = this.populateALVariables();
    }

    private populateALVariables() : ALVariable[] {
        let alVariables : ALVariable[] = new Array();

        // todo: extend this list

        // master data
        alVariables.push(new ALVariable("Item", "Item", "Record", "Item"));
        alVariables.push(new ALVariable("Customer", "Customer", "Record", "Customer"));
        alVariables.push(new ALVariable("Vendor", "Vendor", "Record", "Vendor"));
        alVariables.push(new ALVariable("GLAccount", "GLAccount", "Record", "G/L Account"));
        alVariables.push(new ALVariable("Job", "Job", "Record", "Job"));

        // document headers
        alVariables.push(new ALVariable("SalesHeader", "SalesHeader", "Record", "Sales Header"));
        alVariables.push(new ALVariable("SalesInvoiceHeader", "SalesInvHeader", "Record", "Sales Invoice Header"));
        alVariables.push(new ALVariable("SalesShipmentHeader", "SalesShptHeader", "Record", "Sales Shipment Header"));
        alVariables.push(new ALVariable("SalesCrMemoHeader", "SalesCrMemoHdr", "Record", "Sales Cr.Memo Header"));

        alVariables.push(new ALVariable("PurchaseHeader", "PurchHdr", "Record", "Purchase Header"));
        alVariables.push(new ALVariable("PurchInvHeader", "PurchInvHdr", "Record", "Purch. Inv. Header"));
        alVariables.push(new ALVariable("PurchRcptHeader", "PurchRcptHdr", "Record", "Purch. Rcpt. Header"));
        alVariables.push(new ALVariable("PurchCrMemoHeader", "PurchCrMemoHdr", "Record", "Purch. Cr.Memo Hdr."));
        

        // document lines
        alVariables.push(new ALVariable("SalesLine", "SalesLine", "Record", "Sales Line"));
        alVariables.push(new ALVariable("SalesCrMemoLine", "SalesCrMemoLine", "Record", "Sales Cr.Memo Line"));

        alVariables.push(new ALVariable("PurchaseLine", "PurchLine", "Record", "Purchase Line"));
        alVariables.push(new ALVariable("PurchRcptLine", "PurchRcptLine", "Record", "Purch. Rcpt. Line"));
        alVariables.push(new ALVariable("PurchInvLine", "PurchInvLine", "Record", "Purch. Inv. Line"));
        alVariables.push(new ALVariable("PurchCrMemoLine", "PurchCrMemoLine", "Record", "Purch. Cr.Memo Line"));

        // ledger entries
        alVariables.push(new ALVariable("GLEntry", "GLEntry", "Record", "G/L Entry"));
        alVariables.push(new ALVariable("VendorLedgerEntry", "VendLedgEntry", "Record", "Vendor Ledger Entry"));
        alVariables.push(new ALVariable("JobLedgerEntry", "JobLedgEntry", "Record", "Job Ledger Entry"));
        alVariables.push(new ALVariable("ResLedgerEntry", "ResLedgEntry", "Record", "Res. Ledger Entry"));

        // journal lines
        alVariables.push(new ALVariable("GenJournalLine", "GenJnlLine", "Record", "General Journal Line"));
        alVariables.push(new ALVariable("ItemJournalLine", "ItemJnlLine", "Record", "Item Journal Line"));
        alVariables.push(new ALVariable("JobJournalLine", "JobJnlLine", "Record", "Job Journal Line"));

        // setup tables
        alVariables.push(new ALVariable("UserSetup", "UserSetup", "Record", "User Setup"));

        return alVariables;
    }

    public variableNameExists(varName : string) : boolean {
        let alVariable = this._alVariables.find(i => i.longVarName === varName);
        if (!alVariable) {
            this._alVariables.find(i => i.shortVarName === varName);
        }
        if (alVariable) {
            return true;
        }
        else {
            return false;
        }
    }

    public getObjectTypeAndNameFromVarName(varName: string) : string {
        let alVariable = this._alVariables.find(i => i.longVarName === varName);
        if (!alVariable) {
            this._alVariables.find(i => i.shortVarName === varName);
        }
        if (alVariable) {
            let objName = alVariable.objectName;
            if (objName.includes(" ")) {
                objName = "\"" + objName + "\"";
            }
            return alVariable.objectType + " " + objName;
        }
        else {
            return "";
        }
    }
}