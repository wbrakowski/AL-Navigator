import { isUndefined } from "util";
import { StringFunctions } from '../additional/stringFunctions';

export class ALVariable {
    public name: string;
    public objectType: string = "";
    public objectName: string = "";
    public isLocal: boolean = true;
    public isTemporary: boolean = false;
    public isLabel: boolean = false;
    public labelValue: string = "";
    
    constructor(name: string) {
        this.name = name;
    }

    public getVariableDeclarationString(): string {
        let declarationString = "";
        declarationString += this.name;
        declarationString += ": ";
        declarationString += this.objectType;
        if (this.isLabel) {
            declarationString += ' ';
            declarationString += '\'';
            declarationString += this.labelValue? this.labelValue + '\'' : '\'';
        }
        if (this.objectName) {
            declarationString += " ";
            declarationString += StringFunctions.containsSpecialChars(this.objectName)? "\"" + this.objectName + "\"" : this.objectName;
        }
        if (this.isTemporary) {
            declarationString += ' temporary';
        }
        declarationString += ';';
        return declarationString;
    }
    public getVariableTypeList(): string[] {
        return ['array', 'Action', 
                'BigInteger', 'BigText', 'Boolean', 'Byte',
                'Char', 'ClientType', 'Code', 'Codeunit', 'ControlAddIn',
                'DataClassification', 'DataScope', 'Date', 'DateFormula', 'DateTime','Decimal', 'DefaultLayout', 'Dialog', 'Dictionary', 'DotNet', 'Duration',
                'Enum', 'ErrorInfo', 'ErrorType', 'ExecutionContext', 'ExecutionMode',
                'FieldClass', 'FieldRef', 'FieldType', 'File', 'FilterPageBuilder',
                'Guid',
                'HttpClient', 'HttpContent', 'HttpHeaders', 'HttpRequestMessage', 'HttpResponseMessage',
                'Instream', 'Integer',
                'Interface',
                'JsonArray', 'JsonObject', 'JsonToken', 'JsonValue',
                'KeyRef',
                'Label', 'List', 
                'ModuleDependencyInfo', 'ModuleInfo',
                'Notification', 'NotificationScope',
                'ObjectType', 'Option', 'OutStream',
                'Page', 'PageBackgroundTaskErrorLevel',
                'Query',
                'Record', 'RecordId', 'RecordRef', 'Report', 'ReportFormat',
                'SecurityFilter', 'SessionSettings',
                'TableConnectionType', 'TestPage', 'TestPermissions', 'Text', 'TextBuilder', 'TextConst', 'TextEncoding', 'Time', 'TransactionModel', 'TransactionType',
                'Variant', 'Verbosity', 'Version',
                'WebServiceActionConText', 'WebServiceActionResultCode',
                'XmlAttribute', 'XmlAttributeCollection', 'XmlCData', 'XmlComment', 'XmlDeclaration', 'XmlDocument', 'XmlDocumentType', 'XmlElement', 'XmlNamespaceManager', 'XmlNameTable', 'XmlNode', 'XmlNodeList', 'XmlPort', 'XmlProcessingInstruction', 'XmlReadOptions', 'XmlText', 'XmlWriteOptions'
                ];
    }
}