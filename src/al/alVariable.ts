import { isUndefined } from "util";
import { StringFunctions } from '../additional/stringFunctions';

export class ALVariable {
    public name: string;
    public objectType: string;
    public objectName: string;
    public isLocal: boolean;
    constructor(name: string) {
        this.name = name;
        this.isLocal = true;
        this.objectName = "";
        this.objectType = "";
    }

    public getVariableDeclarationString(): string {
        let declarationString = "";
        declarationString += this.name;
        declarationString += ": ";
        declarationString += this.objectType;
        declarationString += this.objectName;
        return declarationString;
    }
}