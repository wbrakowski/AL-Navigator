import { ALDataTypes } from "./alDataTypes";


export class ALDataType {
    type: ALDataTypes = ALDataTypes.none;
    public subTypes: ALDataType[] = [];
    getStringForDataType(): string {
        return ""
    }
}

export class DefaultDataType implements ALDataType {
    // Note: all "easy" data types without additional information. Like Integer, Decimal etc.
    public type: ALDataTypes;
    public subTypes: ALDataType[] = [];

    constructor(type: ALDataTypes) {
        this.type = type;
    }

    getStringForDataType(): string {
        return this.type;
    }
}

export class CodeTextDataType implements ALDataType {
    // Note: all "easy" data types with a length: Code, Text
    public type: ALDataTypes;
    public length: string = "";
    public subTypes: ALDataType[] = [];

    constructor(type: ALDataTypes, length?: string) {
        this.type = type;
        if (length) {
            this.length = length;
        }
    }

    getStringForDataType(): string {
        if (this.length) {
            return `${this.type}[${this.length}]`;
        }
        else {
            return `${this.type}`;
        }
    }
}


export class LabelDataType implements ALDataType {
    public type: ALDataTypes = ALDataTypes.Label;
    public labelText: string = "";
    public subTypes: ALDataType[] = [];

    constructor(labelText?: string) {
        if (labelText) {
            this.labelText = labelText;
        }
    }

    getStringForDataType(): string {
        return `${this.type} '${this.labelText}'`;
    }
}

export class ListDataType implements ALDataType {
    // Examples
    // f: List of [Integer];
    // z: List of [Dictionary[Code[50], Decimal]]
    public type: ALDataTypes = ALDataTypes.List;
    public value: string = "";
    public subTypes: ALDataType[] = [];

    public getStringForDataType(): string {
        let value: string = `${this.type} of [`;
        let stop: boolean;
        for (let i = 0; i < this.subTypes.length; i++) {
            stop = false;
            if (i > 0) {
                switch (this.subTypes[i - 1].type) {
                    case ALDataTypes.Dictionary: {
                        value += this.subTypes[i].getStringForDataType();
                        value += ", ";
                        stop = true;
                        break;
                    }
                }
                if (i > 1) {
                    switch (this.subTypes[i - 2].type) {
                        case ALDataTypes.Dictionary: {
                            value += this.subTypes[i].getStringForDataType();
                            value += "]";
                            stop = true;
                            break;
                        }
                    }
                }
            }

            if (!stop) {
                value += this.subTypes[i].getStringForDataType();
            }
        }
        value += "]";
        return value;
    }
}

export class ArrayDataType implements ALDataType {
    // Example: Array[1] of Integer;
    public type: ALDataTypes = ALDataTypes.array;
    public dim: string = ""; // = dimension
    public subTypes: ALDataType[] = [];

    constructor(dim?: string) {
        if (dim) {
            this.dim = dim;
        }
    }

    public getStringForDataType(): string {
        let value: string = `${this.type}[${this.dim}] of `;
        for (let i = 0; i < this.subTypes.length; i++) {
            value += this.subTypes[i].getStringForDataType();
        }
        return value;
    }
}

export class DictionaryDataType implements ALDataType {
    // Examples
    // f: Dictionary of [List of [integer], Integer]
    //z: List[Dictionary[Code[50], Decimal]]
    public type: ALDataTypes = ALDataTypes.Dictionary;
    // public key: ALDataType;
    // public value: ALDataType;
    // 0 = key, 1 = value
    public subTypes: ALDataType[] = [];

    public getStringForDataType(): string {
        let value: string = `${this.type} of [`;
        // key
        if (this.subTypes[0]) {
            value += this.subTypes[0].getStringForDataType();
            value += ', ';
            if (this.subTypes[1]) {
                value += this.subTypes[1].getStringForDataType();
                value += "]";
            }
        }
        return value;
    }
}

// TODO TextConst
// export class TextConstDataType implements ALDataType {
//     public type: ALDataTypes = ALDataTypes.List;
//     public value: string = "";
//     public subTypes: ALDataType[] = [];

//     public getStringForDataType(): string {
//         let value: string = `${ALDataTypes.List}`;
//         for (let i = 0; i < this.subTypes.length; i++) {
//             value += this.subTypes[i].getStringForDataType();
//         }
//         value += "]";
//         return value;
//     }
// }

