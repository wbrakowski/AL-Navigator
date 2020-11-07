import * as vscode from 'vscode';
import { ALCodeCommand } from './alCodeCommand';
import { ALVariable } from './alVariable';
import { ALFileCrawler } from './alFileCrawler';
import { TextBuilder } from '../additional/textBuilder';
import { ObjectTypes } from '../additional/objectTypes';
import { ALVarHelper } from './alVarHelper';
import { ALFiles } from './alFiles';
import { ALVarTypes } from './alVarTypes';
import { StringFunctions } from '../additional/stringFunctions';
import { FileJumper } from '../additional/fileJumper';
import { strict } from 'assert';
// import { Settings } from '../additional/Settings';


export class ALAddVarCodeCommand extends ALCodeCommand {
    public varName: string = '';
    public local: boolean = false;
    public document: vscode.TextDocument | undefined;
    protected _alFiles: ALFiles;
    protected _ignoreALPrefixUpperCase: string = '';
    protected _ignoreALSuffixUpperCase: string = '';

    constructor(context: vscode.ExtensionContext, commandName: string, alFiles: ALFiles) {
        super(context, commandName);
        this._alFiles = alFiles;
        // TODO Save the configuration and only get it if it changes (use a watcher)
        let config = vscode.workspace.getConfiguration('alNavigator');
        let ignoreALPrefix = config.get('ignoreALPrefix');
        let ignoreALSuffix = config.get('ignoreALSuffix');
        if (typeof ignoreALPrefix == 'string') {
            this._ignoreALPrefixUpperCase = ignoreALPrefix.toUpperCase();
        }
        if (typeof ignoreALSuffix == 'string') {
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
        let lineNo: number = ALFileCrawler.findVariableInsertLine(this.local);

        let alVariable = await this.createALVariable(this.varName);
        let varNameOriginal = "";
        if (!alVariable) {
            return;
        }
        else {
            alVariable.isLocal = this.local;
            varNameOriginal = alVariable.name;
            alVariable.ignoreALPrefix = this._ignoreALPrefixUpperCase;
            alVariable.ignoreALSuffix = this._ignoreALSuffixUpperCase;
        }



        if (!alVariable.objectType && !alVariable.varType) {
            var varTypeSelected = await this.selectVarTypeManually(alVariable);
            if (!varTypeSelected) {
                return;
            }
        }
        else {
            alVariable.typeAutomaticallyDetected = true;
        }

        let varDeclaration = TextBuilder.buildVarDeclaration(range, alVariable);
        let content: string = varDeclaration.declaration;
        content += '\n';

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
                let pos = new vscode.Position(lineNo, 0);
                editBuilder.insert(pos, content);
            });
            if (varDeclaration.createsVarSection) {
                lineNo += 1;
            }
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
        let objectType: ObjectTypes = ObjectTypes.none;
        if (selectedType) {
            switch (selectedType) {
                case "array": {
                    // Define dimension
                    let dims = await vscode.window.showInputBox({ placeHolder: `Type dimension for ${selectedType}` });
                    if (dims) {
                        alVariable.varType = ALVarTypes.array;
                        alVariable.varValue = "[" + dims + "]";
                        let arrayType = await vscode.window.showQuickPick(varTypes, {
                            placeHolder: `Choose type for ${selectedType}`
                        });
                        if (arrayType) {
                            alVariable.varValue += " of " + arrayType;
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return false;
                    }
                    break;
                }
                case "Code": {
                    // Define length
                    let selectedValue = await vscode.window.showInputBox({ placeHolder: `Type length for ${selectedType}` });
                    if (selectedValue) {
                        alVariable.varType = ALVarTypes.Code;
                        alVariable.varValue = "[" + selectedValue + "]";
                    }
                    break;
                }
                case "Dictionary": {
                    // Define dimension
                    let key = await vscode.window.showQuickPick(varTypes, {
                        placeHolder: `Select key for ${selectedType}`
                    });
                    if (key) {
                        let keyLength: string | undefined;
                        if (key === "Text" || key === "Code") {
                            keyLength = await vscode.window.showInputBox({ placeHolder: `Type length for ${key}` });
                        }
                        alVariable.varType = ALVarTypes.Dictionary;
                        alVariable.varValue = keyLength ? ` of [${key}[${keyLength}], ` : ` of [${key}, `;
                        let value = await vscode.window.showQuickPick(varTypes, {
                            placeHolder: `Select value for ${selectedType}`
                        });
                        if (value) {
                            let valueLength: string | undefined;
                            if (value === "Text" || value === "Code") {
                                valueLength = await vscode.window.showInputBox({ placeHolder: `Type length for ${value}` });
                            }
                            alVariable.varValue += valueLength ? `${value}[${valueLength}]]` : `${value}]`;
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return false;
                    }
                    break;
                }
                case "Label": {
                    // Define Label value
                    let selectedValue = await vscode.window.showInputBox({ placeHolder: `Type value for ${selectedType}` });
                    if (selectedValue) {
                        alVariable.varType = ALVarTypes.Label;
                        alVariable.varValue = ' \'' + selectedValue + '\'';
                    }
                    else {
                        alVariable.varValue = ' \'\'';
                    }
                    break;
                }
                case "List": {
                    // Define dimension
                    let listType = await vscode.window.showQuickPick(varTypes, {
                        placeHolder: `Select type for ${selectedType}`
                    });
                    if (listType) {
                        alVariable.varType = ALVarTypes.List;
                        alVariable.varValue = " of [" + listType + "]";
                    }
                    else {
                        return false;
                    }
                    break;
                }
                case "Text": {
                    // Define Label value
                    let selectedValue = await vscode.window.showInputBox({ placeHolder: `Type length for ${selectedType}` });
                    if (selectedValue) {
                        alVariable.varType = ALVarTypes.Text;
                        alVariable.varValue = "[" + selectedValue + "]";
                    }
                    break;
                }
                case "Record":
                    objectType = ObjectTypes.table;
                    break;
                case "Codeunit":
                    objectType = ObjectTypes.codeunit;
                    break;
                case "Report":
                    objectType = ObjectTypes.report;
                    break;
                case "Page":
                case "TestPage":
                    objectType = ObjectTypes.page;
                    break;
                case "Query":
                    objectType = ObjectTypes.query;
                    break;
                case "XmlPort":
                    objectType = ObjectTypes.xmlport;
                    break;
                case "Enum":
                    objectType = ObjectTypes.enum;
                    break;
                case "Interface":
                    objectType = ObjectTypes.interface;
                    break;
                case "Codeunit":
                    objectType = ObjectTypes.codeunit;
                    break;
                case "ControlAddIn":
                    objectType = ObjectTypes.controlAddIn;
                    break;
                default:
                    alVariable.varType = (<any>ALVarTypes)[selectedType];;
            }
            if (objectType !== ObjectTypes.none) {
                let objectList: string[] = this._alFiles.getObjectList(objectType);
                let selectedObject = await vscode.window.showQuickPick(objectList, {
                    canPickMany: false,
                    placeHolder: `Select ${selectedType}`
                });
                if (selectedObject) {
                    alVariable.objectType = objectType === ObjectTypes.table ? "Record" : StringFunctions.titleCaseWord(objectType);
                    alVariable.objectName = selectedObject;
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
                }
                else {
                    return false;
                }
            }
            else {

            }
            return true;
        }
        else {
            return false;
        }
    }



}
