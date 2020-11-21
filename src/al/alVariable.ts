import { isUndefined } from "util";
import { StringFunctions } from '../additional/stringFunctions';
import { ALDataType, ArrayDataType, CodeTextDataType, DefaultDataType, DictionaryDataType, LabelDataType, ListDataType } from "./alDataType";
import { ALDataTypes } from "./alDataTypes";

export class ALVariable {
    public name: string;
    public objectType: string = "";
    public objectName: string = "";
    public isLocal: boolean = true;
    public isTemporary: boolean = false;
    public alDataType: ALDataType | undefined;
    public ignoreALPrefix: string = "";
    public ignoreALSuffix: string = "";
    public typeAutomaticallyDetected: boolean = false;
    public abortProcess: boolean = false;

    constructor(name: string) {
        this.name = name;
    }

    public getVariableDeclarationString(): string {
        let declarationString = "";
        // Only remove prefixes/suffixes if a variable suggestion name is being used
        let variableName = this.typeAutomaticallyDetected ? this.name : StringFunctions.removePrefixAndSuffixFromVariableName(this.name, this.ignoreALPrefix, this.ignoreALSuffix)
        declarationString += variableName;
        declarationString += ": ";
        if (this.alDataType) {
            declarationString += this.alDataType.getStringForDataType();
        }
        else {
            declarationString += this.objectType;
        }
        if (this.objectName) {
            declarationString += " ";
            declarationString += StringFunctions.containsSpecialChars(this.objectName) ? "\"" + this.objectName + "\"" : this.objectName;
        }
        if (this.isTemporary) {
            declarationString += ' temporary';
        }
        declarationString += ';';
        return declarationString;
    }

    public setDataType(typeText: string, level: number, valueForType?: string) {
        let alDataType: ALDataTypes = (<any>ALDataTypes)[typeText];
        switch (level) {
            case 1: {
                this.alDataType = this.createDataType(alDataType, valueForType);
                break;
            }
            default: {
                if (this.alDataType) {
                    switch (this.alDataType) {
                    }
                    this.alDataType.subTypes[level - 2] = this.createDataType(alDataType, valueForType);
                }
                break;
            }
        }
    }

    public createDataType(alDataType: ALDataTypes, valueForType?: string): ALDataType {
        let dt: ALDataType;
        switch (alDataType) {
            case ALDataTypes.Code:
            case ALDataTypes.Text: {
                dt = valueForType ? new CodeTextDataType(alDataType, valueForType) : new CodeTextDataType(alDataType);
                break;
            }
            case ALDataTypes.Label: {
                dt = valueForType ? new LabelDataType(valueForType) : new LabelDataType();
                break;
            }
            case ALDataTypes.List: {
                dt = new ListDataType();
                break;
            }
            case ALDataTypes.array: {
                dt = valueForType ? new ArrayDataType(valueForType) : new ArrayDataType();
                break;
            }
            case ALDataTypes.Dictionary: {
                dt = new DictionaryDataType();
                break;
            }
            default: {
                dt = new DefaultDataType(alDataType);
                break;
            }
        }
        return dt;
    }

}

// examples:
//arrayText2: Array[2] of Text[20];
//f: Dictionary of [Integer, Text[20]];
// z: List of[Dictionary[Code[50], Decimal]]
