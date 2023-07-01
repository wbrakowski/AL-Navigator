import * as vscode from 'vscode';
import { ALFiles } from '../alFiles';
import { Report } from './report';

export class ReportCreator {
  static async startCreateReportDialog(alFiles: ALFiles) {
    const option1 = 'Copy report including layout';
    const option2 = 'Create report extension including layout';
    const creationOptions: string[] = [option1, option2];

    const selectedOption = await vscode.window.showQuickPick(creationOptions, {
      placeHolder: 'Select the desired operation',
    });

    if (selectedOption) {
      switch (selectedOption) {
        case option1:
          await this.copyReport(alFiles, false);
          break;
        case option2:
          await this.copyReport(alFiles, true);
          break;
        default:
          console.log('You shall not slay the dragons');
      }
    }
  }

  static async copyReport(alFiles: ALFiles, createExtension: boolean) {
    const reportName = await Report.selectReport(alFiles);

    if (reportName) {
      const report = new Report(alFiles);
      await report.copyReportToWorkspace(reportName, createExtension);
    }
  }
}