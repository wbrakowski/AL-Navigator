import * as vscode from 'vscode';
import { ALFiles } from './alFiles';
import { ObjectTypes } from './objectTypes';

export class ReportCreator {
    static async startCreateReportDialog(_alFiles: ALFiles) {
        let option1 = 'Copy standard report including layout';
        let option2 = 'Create report extension including layout';
        let option3 = 'New report with dataset export functionality';
        let option4 = 'New report without dataset export functionality';
        let creationOptions: string[] = [];
        creationOptions[0] = option1;
        creationOptions[1] = option2;
        creationOptions[2] = option3;
        creationOptions[3] = option4;
        let selectedOption = await vscode.window.showQuickPick(creationOptions, {
            placeHolder: `Select the desired operation`
        });
        if (selectedOption) {
            switch (selectedOption) {
                case option1:
                    this.copyStandardReport(_alFiles);
                    break;
                case option2:
                    this.createReportExtension(_alFiles);
                    break;
                case option3:
                    this.createReport(_alFiles, true);
                    break;
                case option4:
                    this.createReport(_alFiles, false);
                    break;
                default:
                    console.log('You shall not slay the dragons');
            }
        }
    }
    static async createReport(_alFiles: ALFiles, includeDataset: boolean) {
        

    }

    static async copyStandardReport(_alFiles: ALFiles) {
        let reports = _alFiles.getObjectList(ObjectTypes.report);
        let selectedReport = await vscode.window.showQuickPick(reports, {
            placeHolder: `Select the report`
        });
        if (selectedReport) {
            this.copyReport(selectedReport);
        }
    }

    static copyReport(reportName: string) {
        throw new Error('Method not implemented.');
    }

    static async createReportExtension(_alFiles: ALFiles) {
        throw new Error('Function not implemented.');
    }
}




