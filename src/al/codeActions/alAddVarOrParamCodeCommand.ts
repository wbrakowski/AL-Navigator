import * as vscode from 'vscode';
import { ALCodeCommand } from './alCodeCommand';
import { ALVariable } from '../alVariable';
import { ALFileCrawler } from '../alFileCrawler';
import { VarTextBuilder } from '../../document/varTextBuilder';
import { ObjectTypes } from '../objectTypes';
import { ALVarHelper } from '../alVarHelper';
import { ALFiles } from '../alFiles';
import { ALDataTypes } from '../alDataTypes';
import { StringFunctions } from '../../additional/stringFunctions';
import { FileJumper } from '../../files/fileJumper';
import { strict } from 'assert';
import { Settings } from 'http2';
import { abort } from 'process';
import { CommandType } from './commandType';
// import { Settings } from '../additional/Settings';


export class ALAddVarOrParamCodeCommand extends ALCodeCommand {
    public varName: string = '';
    public cmdType: CommandType;
    public document: vscode.TextDocument | undefined;
    protected _alFiles: ALFiles;
    protected _ignoreALPrefixUpperCase: string = '';
    protected _ignoreALSuffixUpperCase: string = '';

    constructor(context: vscode.ExtensionContext, commandName: string, alFiles: ALFiles, cmdType: CommandType) {
        super(context, commandName);
        this._alFiles = alFiles;
        this.setAffixes();
        vscode.workspace.onDidChangeConfiguration((change) => {
            this.setAffixes();
        });
        this.cmdType = cmdType;
    }

    private setAffixes() {
        let config = vscode.workspace.getConfiguration('alNavigator');
        let ignoreALPrefix = config.get('ignoreALPrefix');
        let ignoreALSuffix = config.get('ignoreALSuffix');
        if (typeof ignoreALPrefix === 'string') {
            this._ignoreALPrefixUpperCase = ignoreALPrefix.toUpperCase();
        }
        if (typeof ignoreALSuffix === 'string') {
            this._ignoreALSuffixUpperCase = ignoreALSuffix.toUpperCase();
        }
    }

    protected async runAsync(range: vscode.Range) {
        await this.insertVariable(range);
    }

    protected async insertVariable(range: vscode.Range) {
        if (!this.document) {
            return;
        }
        let lineNo: number = ALFileCrawler.findVariableInsertLine(this.cmdType);

        await this._alFiles.fillObjects();
        let alVariable = await this.createALVariable(this.varName);
        let varNameOriginal = "";
        if (!alVariable) {
            return;
        }
        else {
            alVariable.cmdType = this.cmdType;
            varNameOriginal = alVariable.name;
            alVariable.ignoreALPrefix = this._ignoreALPrefixUpperCase;
            alVariable.ignoreALSuffix = this._ignoreALSuffixUpperCase;
        }



        if (!alVariable.alDataType) {
            var varTypeSelected = await this.selectVarTypeManually(alVariable);
            if (!varTypeSelected) {
                return;
            }
        }
        else {
            alVariable.typeAutomaticallyDetected = true;
        }

        let varDeclaration = VarTextBuilder.buildVarDeclaration(range, alVariable);
        let content: string = varDeclaration.declaration;
        if (this.cmdType !== CommandType.Parameter) {
            content += '\n';
        }

        let editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;


        let newVarName: string = "";

        if (varNameOriginal !== alVariable.name) {
            // User decided to change the variable name to the suggested variable name -> replace the existing range text
            newVarName = alVariable.name;
        }

        if (editor) {
            if (newVarName !== "") {
                await editor.edit(editBuilder => {
                    let startCharacter = range.start.character - varNameOriginal.length;
                    let startPos = new vscode.Position(range.start.line, startCharacter);
                    let replaceRange = new vscode.Range(startPos, range.end);
                    editBuilder.replace(replaceRange, newVarName);
                }).then(success => {
                    // Remove the selection that is automatically active after replacing text
                    if (editor) {
                        var position = editor.selection.end;
                        editor.selection = new vscode.Selection(position, position);
                    }
                });
            }
            await editor.edit(editBuilder => {
                switch (this.cmdType) {
                    case CommandType.Parameter: {
                        if (editor) {
                            let textLine = editor.document.lineAt(lineNo);
                            let lastBracketIdx: number = textLine.text.lastIndexOf(")");
                            if (lastBracketIdx !== -1) {
                                let pos = new vscode.Position(lineNo, lastBracketIdx);
                                editBuilder.insert(pos, content);
                            }
                        }

                        break;
                    }
                    default: {
                        let pos = new vscode.Position(lineNo, 0);
                        editBuilder.insert(pos, content);
                        break;
                    }
                }

            });
        }
    }

    private async createALVariable(varName: string): Promise<ALVariable | undefined> {
        if (!varName) {
            return;
        }
        else {
            let alVar = await this._alFiles.getALVariableByName(varName, this._ignoreALPrefixUpperCase, this._ignoreALSuffixUpperCase);
            return alVar;
        }
    }

    private async selectVarTypeManually(alVariable: ALVariable): Promise<boolean | undefined> {
        let varTypes: string[] = ALVarHelper.getVariableTypeList();

        let selectedType = await vscode.window.showQuickPick(varTypes, {
            canPickMany: false,
            placeHolder: 'Select variable type'
        });
        if (selectedType) {
            switch (selectedType) {
                case "Text":
                case "Code":
                case "Label":
                case "array":
                case "Dictionary":
                case "List":
                    {
                        let level: number = 1;
                        await this.selectMoreInformation(alVariable, selectedType, level);
                        if (alVariable.abortProcess) {
                            return false;
                        }
                        break;
                    }

                case "Record":
                case "Codeunit":
                case "Report":
                case "Page":
                case "TestPage":
                case "Query":
                case "XmlPort":
                case "Enum":
                case "Interface":
                case "Codeunit":
                case "ControlAddIn": {
                    let objectType: ObjectTypes = selectedType === "Record" ? ObjectTypes.table : (<any>ObjectTypes)[selectedType.toLowerCase()];
                    let objectList: string[] = this._alFiles.getObjectList(objectType);
                    let selectedObject = await vscode.window.showQuickPick(objectList, {
                        canPickMany: false,
                        placeHolder: `Select ${selectedType}`
                    });
                    if (selectedObject) {
                        let type: string = objectType === ObjectTypes.table ? "Record" : StringFunctions.titleCaseWord(objectType);
                        let name: string = selectedObject;
                        let suggestedVarNameLong = alVariable.isTemporary ? "Temp" + ALVarHelper.getLongVarName(selectedObject) : ALVarHelper.getLongVarName(selectedObject);
                        let suggestedVarNameShort = alVariable.isTemporary ? "Temp" + ALVarHelper.getShortVarName(selectedObject) : ALVarHelper.getShortVarName(selectedObject);
                        suggestedVarNameLong = StringFunctions.removePrefixAndSuffixFromVariableName(suggestedVarNameLong, this._ignoreALPrefixUpperCase, this._ignoreALSuffixUpperCase);
                        suggestedVarNameShort = StringFunctions.removePrefixAndSuffixFromVariableName(suggestedVarNameShort, this._ignoreALPrefixUpperCase, this._ignoreALSuffixUpperCase);
                        let suggestedVarNames: string[] = suggestedVarNameLong !== suggestedVarNameShort ?
                            [alVariable.name, suggestedVarNameLong, suggestedVarNameShort] : [alVariable.name, suggestedVarNameLong];
                        let selectedVarName = await vscode.window.showQuickPick(suggestedVarNames, {
                            canPickMany: false,
                            placeHolder: 'Select variable name'
                        });
                        if (selectedVarName) {
                            alVariable.name = selectedVarName;
                        }
                        else {
                            return false;
                        }
                        alVariable.setDataType(selectedType, 1, name);
                    }
                    else {
                        return false;
                    }
                    break;

                }
                default: {
                    alVariable.setDataType(selectedType, 1);
                }
            }

            return true;
        }
        else {
            return false;
        }
    }

    private async selectMoreInformation(alVariable: ALVariable, selectedType: string, level: number) {
        let varTypes: string[] = ALVarHelper.getVariableTypeList();
        switch (selectedType) {
            case "Code":
            case "Text": {
                // Choose length
                let length = await vscode.window.showInputBox({ placeHolder: `Type length for ${selectedType}` });
                if (length) {
                    alVariable.setDataType(selectedType, level, length);
                }
                else {
                    if (selectedType === "Text") {
                        alVariable.setDataType(selectedType, level);
                    }
                    else {
                        alVariable.abortProcess = true;
                        break;
                    }
                }
                break;
            }
            case "Label": {
                // Choose label text
                let labelText = await vscode.window.showInputBox({ placeHolder: `Type text for ${selectedType}` });
                if (labelText) {
                    alVariable.setDataType(selectedType, level, labelText);
                }
                else {
                    alVariable.abortProcess = true;
                    // Create label anyway
                    // alVariable.setDataType(selectedType, level, ' \'\'');
                }
                break;
            }

            case "Dictionary": {
                // key
                let key = await vscode.window.showQuickPick(varTypes, {
                    placeHolder: `Select key for ${selectedType}`
                });
                if (key) {
                    alVariable.setDataType(selectedType, level);
                    level += 1;
                    if (this.isComplexVarType(key)) {
                        await this.selectMoreInformation(alVariable, key, level);
                        if (alVariable.abortProcess) {
                            return;
                        }
                    }
                    else {
                        alVariable.setDataType(key, level);
                    }
                    // value
                    let value = await vscode.window.showQuickPick(varTypes, {
                        placeHolder: `Select value for ${selectedType}`
                    });
                    if (value) {
                        level += 1;
                        if (this.isComplexVarType(value)) {
                            await this.selectMoreInformation(alVariable, value, level);
                            if (alVariable.abortProcess) {
                                return;
                            }
                        }
                        else {
                            alVariable.setDataType(value, level);
                        }
                    }
                }
                else {
                    alVariable.abortProcess = true;
                }
                break;
            }
            case 'array': {
                // Example: x: Array[2] of Text[20];
                // Example: y: Array[3] of Integer;
                // Define dimension
                let dim = await vscode.window.showInputBox({ placeHolder: `Type dimension for ${selectedType}` });
                if (dim) {
                    let arrayType = await vscode.window.showQuickPick(varTypes, {
                        placeHolder: `Choose type for ${selectedType}`
                    });
                    if (arrayType) {
                        alVariable.setDataType(selectedType, level, dim);
                        if (this.isComplexVarType(arrayType)) {
                            level += 1;

                            await this.selectMoreInformation(alVariable, arrayType, level);
                            if (alVariable.abortProcess) {
                                return;
                            }
                        }
                        else {
                            // if (alVariable.alDataType) {
                            alVariable.setDataType(arrayType, level + 1);
                            // }
                        }
                    }
                    else {
                        alVariable.abortProcess = true;
                    }
                }
                else {
                    alVariable.abortProcess = true;
                }
                break;
            }
            case "List": {
                // Define type
                let listType = await vscode.window.showQuickPick(varTypes, {
                    placeHolder: `Select type for ${selectedType}`
                });
                if (listType) {
                    alVariable.setDataType(selectedType, level);
                    level += 1;
                    if (this.isComplexVarType(listType)) {
                        await this.selectMoreInformation(alVariable, listType, level);
                        if (alVariable.abortProcess) {
                            return;
                        }
                    }
                    else {
                        if (alVariable.alDataType) {
                            alVariable.setDataType(listType, level);
                        }

                    }
                }
                break;
            }
            default:
                alVariable.abortProcess = true;
        }
    }

    private isComplexVarType(varType: string): boolean {
        switch (varType) {
            case "array":
            case "Code":
            case "Dictionary":
            case "Label":
            case "List":
            case "Text": {
                return true;
            }
            default:
                return false;
        }
    }
}
