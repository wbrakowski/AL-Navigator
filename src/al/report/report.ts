import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALFiles } from '../alFiles';
import { ObjectTypes } from '../objectTypes';
import * as FileHelper from '../../files/fileHelper';
import * as FolderHelper from '../../files/folderHelper';
import { StringFunctions } from '../../additional/stringFunctions';
import { reportTextBuilder } from './reportTextBuilder';
import { ALCodeOutlineExtension } from '../../al_code_outline/devToolsExtensionContext';
import { getActiveWorkspacePath, stripReportFolder } from '../../files/folderHelper';
import * as fsExtra from 'fs-extra';
import * as AdmZip from 'adm-zip';
import { CustomConsole } from '../../additional/console';

export class Report {
  constructor(private alFiles: ALFiles) { }

  static async selectReport(alFiles: ALFiles): Promise<{ name: string; appFilePath: string } | undefined> {
    const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();
    if (!activeWorkspaceFolder) {
      vscode.window.showErrorMessage('No active workspace folder found.');
      return undefined;
    }

    const alpackagesFolderPath = FolderHelper.getAlPackagesFolder(activeWorkspaceFolder);
    if (!alpackagesFolderPath) {
      vscode.window.showErrorMessage('No .alpackages folder found in workspace.');
      return undefined;
    }

    // Show progress while loading reports
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading reports from app packages...',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Extracting reports from .app files...' });
          const reports = await FileHelper.getAllReportsFromAppFiles(alpackagesFolderPath);

          if (reports.length === 0) {
            vscode.window.showInformationMessage('No reports found in any app package.');
            return undefined;
          }

          progress.report({ message: 'Preparing report selection...' });

          // Create QuickPick items with report details
          const reportItems = reports.map(report => ({
            label: `Report | ID: ${report.id} | ${report.name}`,
            description: `App: ${report.appName}`,
            detail: report.appFilePath,
            reportName: report.name,
            appFilePath: report.appFilePath
          }));

          // Show the report selection
          const selectedReport = await vscode.window.showQuickPick(reportItems, {
            placeHolder: 'Select a report to copy (Report | ID | Name | App)',
            matchOnDescription: true,
            matchOnDetail: true
          });

          if (!selectedReport) {
            return undefined;
          }

          return {
            name: selectedReport.reportName,
            appFilePath: selectedReport.appFilePath
          };
        } catch (error) {
          vscode.window.showErrorMessage(`Error loading reports: ${error}`);
          return undefined;
        }
      }
    );
  }


  async copyReportToWorkspace(reportName: string, appFilePath: string, createExtension: boolean) {
    if (!reportName) {
      return;
    }

    const activeWorkspaceFolder = FolderHelper.getActiveWorkspacePath();

    if (!activeWorkspaceFolder) {
      vscode.window.showInformationMessage('No active workspace folder found.');
      return;
    }

    const alpackagesFolderPath = FolderHelper.getAlPackagesFolder(activeWorkspaceFolder);

    // Check if the alpackages folder exists
    if (!alpackagesFolderPath) {
      vscode.window.showInformationMessage(`No .alpackages folder found in ${activeWorkspaceFolder}.`);
      return;
    }

    const objectName = await this.promptForObjectName(reportName);
    if (objectName === '') {
      return;
    }
    const objectID = await this.getFirstSuggestedReportId();

    // Intelligently find the target folder for the report files
    let reportAlFolder: string | undefined;
    let reportLayoutFolder: string | undefined;

    if (createExtension) {
      // For report extensions, prioritize reportextension folders
      const foldersWithReportAl = FolderHelper.findFoldersWithReportAlFiles(activeWorkspaceFolder);

      // Try to find a reportextension-specific folder first
      const reportExtensionFolder = FolderHelper.findReportExtensionFolder(activeWorkspaceFolder);
      const reportExtensionFolders = foldersWithReportAl.filter(folder =>
        folder.toLowerCase().includes('reportextension')
      );

      if (reportExtensionFolders.length > 0) {
        reportAlFolder = await FolderHelper.promptForFolderSelection(reportExtensionFolders, 'AL');
        if (!reportAlFolder) {
          // User cancelled
          return;
        }
      } else if (reportExtensionFolder) {
        // Use the found reportextension folder
        reportAlFolder = reportExtensionFolder;
      } else if (foldersWithReportAl.length > 0) {
        // Fallback to any folder with report AL files
        reportAlFolder = await FolderHelper.promptForFolderSelection(foldersWithReportAl, 'AL');
        if (!reportAlFolder) {
          return;
        }
      } else {
        // Last resort: use default report folder or workspace root
        reportAlFolder = FolderHelper.findReportFolder(activeWorkspaceFolder) || activeWorkspaceFolder;
      }
    } else {
      // For regular report copies, use existing logic
      const foldersWithReportAl = FolderHelper.findFoldersWithReportAlFiles(activeWorkspaceFolder);
      if (foldersWithReportAl.length > 0) {
        reportAlFolder = await FolderHelper.promptForFolderSelection(foldersWithReportAl, 'AL');
        if (!reportAlFolder) {
          // User cancelled
          return;
        }
      } else {
        // Fallback to default report folder or workspace root
        reportAlFolder = FolderHelper.findReportFolder(activeWorkspaceFolder) || activeWorkspaceFolder;
      }
    }

    // Find folders with existing report layout files (.rdl/.rdlc)
    const foldersWithReportLayouts = FolderHelper.findFoldersWithReportLayouts(activeWorkspaceFolder);
    if (foldersWithReportLayouts.length > 0) {
      reportLayoutFolder = await FolderHelper.promptForFolderSelection(foldersWithReportLayouts, 'layout');
      if (!reportLayoutFolder) {
        // User cancelled
        return;
      }
    } else {
      // Use the same folder as AL files if no layout folder found
      reportLayoutFolder = reportAlFolder;
    }

    // We already have the app file path from the selection, so no need to search
    const appFileName = path.basename(appFilePath);
    vscode.window.showInformationMessage(`Creating report from ${appFileName}...`);

    // Create a temporary folder path for extracting the file
    const tempFolderPath = path.join(activeWorkspaceFolder, 'temp');
    FileHelper.ensureDirSync(tempFolderPath);

    const tempAppFilePath = path.join(tempFolderPath, path.basename(appFilePath));

    await FileHelper.removeHeaderFromAppFile(appFilePath, tempAppFilePath);

    let sourceFileName = StringFunctions.removeSpecialCharsAndSpaces(reportName);
    let targetFileName = StringFunctions.removeSpecialCharsAndSpaces(objectName);

    if (sourceFileName.endsWith('KTG')) {
      sourceFileName = sourceFileName.slice(0, -3);
    }

    let sourceAlFileName = sourceFileName + '.Report.al';
    let targetAlFileName = targetFileName + '.Report.al';

    // Extract all unique layout files from the original report
    const layoutFiles = await this.extractLayoutFilesFromReport(tempAppFilePath, sourceAlFileName);

    // Create target filenames for each layout file
    const layoutFileCopyPairs: Array<{ source: string; target: string; type: 'rdlc' | 'word' | 'other' }> = [];

    // If no layout files found in rendering section, fall back to old method (RDLCLayout/WordLayout properties)
    if (layoutFiles.length === 0) {
      // Use the old naming convention for backward compatibility
      const sourceRdlcFileName = sourceFileName + '.rdlc';
      const targetRdlcFileName = targetFileName + '.rdlc';
      const sourceWordFileName = sourceFileName + '.docx';
      const targetWordFileName = targetFileName + '.docx';

      layoutFileCopyPairs.push(
        { source: sourceRdlcFileName, target: targetRdlcFileName, type: 'rdlc' },
        { source: sourceWordFileName, target: targetWordFileName, type: 'word' }
      );
    } else {
      // Modern reports with rendering section: generate unique names for each layout

      let rdlcCounter = 0;
      let wordCounter = 0;

      for (const layoutFile of layoutFiles) {
        const ext = path.extname(layoutFile.source);
        const sourceBaseName = path.basename(layoutFile.source, ext);
        let targetLayoutFile: string;

        // Determine file type (keep original type from extraction)
        let fileType = layoutFile.type;
        if (fileType === 'rdlc') {
          // For RDLC files: use base name or number them if multiple exist
          if (rdlcCounter === 0) {
            targetLayoutFile = targetFileName + '.rdlc';
          } else {
            targetLayoutFile = `${targetFileName}_${rdlcCounter}.rdlc`;
          }
          rdlcCounter++;
        } else if (fileType === 'word') {
          // For Word files: preserve original naming pattern or number them
          if (wordCounter === 0) {
            targetLayoutFile = targetFileName + ext;
          } else {
            // Try to preserve meaningful suffix from original name
            const sourceNameLower = sourceBaseName.toLowerCase();

            // Extract the suffix after the target name pattern
            if (sourceNameLower.includes('themable')) {
              targetLayoutFile = `${targetFileName}Themable${ext}`;
            } else if (sourceNameLower.includes('email')) {
              targetLayoutFile = `${targetFileName}Email${ext}`;
            } else if (sourceNameLower.includes('blue')) {
              targetLayoutFile = `${targetFileName}Blue${ext}`;
            } else {
              targetLayoutFile = `${targetFileName}_${wordCounter}${ext}`;
            }
          }
          wordCounter++;
        } else {
          // For other file types: keep similar naming pattern
          targetLayoutFile = targetFileName + ext;
        }

        layoutFileCopyPairs.push({ source: layoutFile.source, target: targetLayoutFile, type: fileType });
      }
    }

    try {
      let alFileExists = false;

      if (!createExtension) {
        alFileExists = await FileHelper.copyReportFileToWorkspace(
          tempAppFilePath,
          reportAlFolder,
          sourceAlFileName,
          targetAlFileName
        );

        if (alFileExists) {
          const alFilePath = path.join(reportAlFolder, targetAlFileName);
          const document = await vscode.workspace.openTextDocument(alFilePath);

          let targetLineIndex = -1;
          let updatedLine: string = '';
          let copiedReportId: string | null = null;
          let objectIdLineIdx = 0;
          let originalText = '';
          let objectIdLine: vscode.TextLine | undefined;

          // Find the report declaration line and extract ID
          for (let i = 0; i < 40; i++) {
            const line = document.lineAt(i);
            const lineText = line.text;
            // Match: report <id> "<name>"
            const reportMatch = lineText.match(/report\s+(\d+)\s+"([^"]+)"/i);
            if (reportMatch) {
              copiedReportId = reportMatch[1];
              objectIdLineIdx = i;
              objectIdLine = line;
              originalText = lineText;

              // Build the updated line with new ID and/or name
              updatedLine = lineText;
              if (objectID !== 0) {
                updatedLine = updatedLine.replace(/report\s+\d+/i, `report ${objectID}`);
              }
              if (objectName !== reportName) {
                updatedLine = updatedLine.replace(/"([^"]+)"/, `"${objectName}"`);
              }
              break;
            }
          }

          // Apply ID and name changes if line was found and changed
          if (objectIdLine && updatedLine && updatedLine !== originalText) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, objectIdLine.range, updatedLine);
            await vscode.workspace.applyEdit(edit);
            await document.save();
          }

          // Add "Copied from report" comment after the opening brace
          if (copiedReportId) {
            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
              const lineText = document.lineAt(lineIndex).text;
              if (lineText.includes('{')) {
                targetLineIndex = lineIndex;
                break;
              }
            }

            if (targetLineIndex !== -1) {
              const copiedFromReportLine = targetLineIndex + 1;
              const copiedFromReportText = `// Copied from report ${copiedReportId}: "${reportName}"\n`;

              const edit = new vscode.WorkspaceEdit();
              edit.insert(document.uri, new vscode.Position(copiedFromReportLine, 0), copiedFromReportText);
              await vscode.workspace.applyEdit(edit);
              await document.save();
            }
          }

          // Update all layout file references (RDLCLayout, WordLayout, LayoutFile)
          await this.updateLayoutReferences(document, reportLayoutFolder, layoutFileCopyPairs, activeWorkspaceFolder);
        }
      }

      // Copy all layout files from the report
      const copiedLayoutFiles: Array<{ source: string, target: string, type: 'rdlc' | 'word' | 'other' }> = [];

      for (const layoutPair of layoutFileCopyPairs) {
        const fileExists = await FileHelper.copyReportFileToWorkspace(
          tempAppFilePath,
          reportLayoutFolder,
          layoutPair.source,
          layoutPair.target
        );

        if (fileExists) {
          copiedLayoutFiles.push(layoutPair);
        }
      }

      // Show error only if we're not creating an extension and found no files
      if (!createExtension && !alFileExists && copiedLayoutFiles.length === 0) {
        vscode.window.showInformationMessage(`No report AL file or layout files found for '${reportName}' in ${path.basename(appFilePath)}.`);
      } else if (createExtension) {
        // Find the first RDLC and Word layout for the extension file
        const firstRdlcLayout = copiedLayoutFiles.find(f => f.type === 'rdlc');
        const firstWordLayout = copiedLayoutFiles.find(f => f.type === 'word');

        const extensionFilePath = await Report.createReportExtensionFile(
          reportName,
          objectID,
          objectName,
          firstRdlcLayout?.target || '',
          firstWordLayout?.target || '',
          reportAlFolder,
          reportLayoutFolder
        );

        // Open the created extension file
        if (extensionFilePath) {
          const document = await vscode.workspace.openTextDocument(extensionFilePath);
          await vscode.window.showTextDocument(document);
        }
      } else if (alFileExists) {
        // Open the copied AL file
        const alFilePath = path.join(reportAlFolder, targetAlFileName);
        const document = await vscode.workspace.openTextDocument(alFilePath);
        await vscode.window.showTextDocument(document);
      }

      // Delete the temp folder
      await fsExtra.remove(tempFolderPath);

    } catch (err) {
      console.error('Error:', err);
    }
  }





  private async promptForObjectName(reportName: string): Promise<string> {
    const objectName = await vscode.window.showInputBox({
      prompt: `Enter a name for the report object '${reportName}':`,
      value: reportName,
      validateInput: this.validateObjectName,
    });

    return objectName || '';
  }

  private validateObjectName(objectName: string): string | null {
    if (!objectName || objectName.trim().length === 0) {
      return 'Object name cannot be empty.';
    }

    return null;
  }

  /**
   * Extracts all layout file references from a report file in the app package
   * @param appFilePath Path to the .app file
   * @param reportFileName Name of the report AL file (e.g., "Rep50100.MyReport.al")
   * @returns Array of objects with source filename, target filename, and type
   */
  private async extractLayoutFilesFromReport(appFilePath: string, reportFileName: string): Promise<Array<{ source: string, target: string, type: 'rdlc' | 'word' | 'other' }>> {
    const layouts: Array<{ source: string, target: string, type: 'rdlc' | 'word' | 'other' }> = [];
    const uniqueFiles = new Set<string>(); // Track unique files to avoid duplicates

    try {
      // Read the report AL file from the app package
      const zip = new AdmZip(appFilePath);
      const entries = zip.getEntries();

      // Find the report AL file
      const reportEntry = entries.find(entry => {
        const entryName = path.basename(entry.entryName);
        return entryName.toLowerCase() === reportFileName.toLowerCase();
      });

      if (!reportEntry) {
        return layouts;
      }

      const reportContent = reportEntry.getData().toString('utf8');

      // Extract the rendering section by finding the start and matching the closing brace
      const renderingStartMatch = reportContent.match(/rendering\s*\{/i);
      if (renderingStartMatch) {
        const startIndex = renderingStartMatch.index! + renderingStartMatch[0].length;

        // Find the matching closing brace by counting braces
        let braceCount = 1;
        let endIndex = startIndex;

        for (let i = startIndex; i < reportContent.length && braceCount > 0; i++) {
          if (reportContent[i] === '{') {
            braceCount++;
          } else if (reportContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }

        const renderingSection = reportContent.substring(startIndex, endIndex);

        // Find all individual layout blocks
        // Pattern: layout("name") { ... }
        const layoutBlockRegex = /layout\s*\(\s*"[^"]*"\s*\)\s*\{([^}]*)\}/gi;
        let layoutMatch;

        while ((layoutMatch = layoutBlockRegex.exec(renderingSection)) !== null) {
          const layoutBlock = layoutMatch[1];

          // Extract LayoutFile from this specific layout block
          const layoutFileMatch = layoutBlock.match(/LayoutFile\s*=\s*'([^']+)'/i);
          if (layoutFileMatch) {
            let layoutPath = layoutFileMatch[1];

            // Extract just the filename from the path
            const sourceFileName = path.basename(layoutPath);

            // Skip if we already have this file
            if (uniqueFiles.has(sourceFileName.toLowerCase())) {
              continue;
            }
            uniqueFiles.add(sourceFileName.toLowerCase());

            // Determine file type
            let type: 'rdlc' | 'word' | 'other' = 'other';
            const ext = path.extname(sourceFileName).toLowerCase();

            if (ext === '.rdl' || ext === '.rdlc') {
              type = 'rdlc';
              // Convert .rdl to .rdlc for the target (AL uses .rdlc in properties)
              const targetFileName = sourceFileName.replace(/\.rdl$/i, '.rdlc');
              layouts.push({
                source: sourceFileName,
                target: targetFileName,
                type
              });
            } else if (ext === '.docx' || ext === '.doc') {
              type = 'word';
              layouts.push({
                source: sourceFileName,
                target: sourceFileName,
                type
              });
            } else {
              // Other file types (Excel, custom, etc.)
              layouts.push({
                source: sourceFileName,
                target: sourceFileName,
                type
              });
            }
          }
        }
      }

    } catch (error) {
      CustomConsole.customConsole.appendLine(`Error extracting layout files from report: ${error}`);
    } return layouts;
  }

  async getFirstSuggestedReportId(): Promise<number> {
    return ALCodeOutlineExtension.getFirstSuggestedReportId();
  }

  /**
   * Updates all layout file references in the AL report file
   * Handles: RDLCLayout, WordLayout, and rendering layout LayoutFile properties
   */
  private async updateLayoutReferences(
    document: vscode.TextDocument,
    reportLayoutFolder: string,
    layoutFiles: Array<{ source: string; target: string; type: 'rdlc' | 'word' | 'other' }>,
    activeWorkspaceFolder: string
  ): Promise<void> {
    // Calculate relative path from workspace root to layout folder
    const relativePath = path.relative(activeWorkspaceFolder, reportLayoutFolder).replace(/\\/g, '/');
    const layoutPath = relativePath ? `./${relativePath}/` : './';

    // Get the first RDLC and Word layout files for property updates
    const firstRdlcLayout = layoutFiles.find(f => f.type === 'rdlc');
    const firstWordLayout = layoutFiles.find(f => f.type === 'word');
    const rdlcFileName = firstRdlcLayout?.target || '';
    const wordFileName = firstWordLayout?.target || '';

    let hasChanges = false;
    const edits: { line: vscode.TextLine; newText: string }[] = [];

    // Process each line in the document
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const lineText = line.text;

      // Update RDLCLayout = 'path/file.rdlc';
      if (lineText.includes('RDLCLayout =') && rdlcFileName) {
        const indent = lineText.match(/^\s*/)?.[0] || '\t';
        const newLine = `${indent}RDLCLayout = '${layoutPath}${rdlcFileName}';`;
        if (lineText.trim() !== newLine.trim()) {
          edits.push({ line, newText: newLine });
          hasChanges = true;
        }
      }

      // Update WordLayout = 'path/file.docx';
      if (lineText.includes('WordLayout =') && wordFileName) {
        const indent = lineText.match(/^\s*/)?.[0] || '\t';
        const newLine = `${indent}WordLayout = '${layoutPath}${wordFileName}';`;
        if (lineText.trim() !== newLine.trim()) {
          edits.push({ line, newText: newLine });
          hasChanges = true;
        }
      }

      // Update LayoutFile = 'path/file' in rendering section
      // We need to match the source filename to determine which target file to use
      if (lineText.includes('LayoutFile =')) {
        const indent = lineText.match(/^\s*/)?.[0] || '\t\t\t';

        // Extract the current filename from the line
        const fileMatch = lineText.match(/LayoutFile\s*=\s*'([^']+)'/);
        if (fileMatch) {
          const currentPath = fileMatch[1];
          const currentFileName = path.basename(currentPath);

          // Find the matching layout file in our list
          const matchingLayout = layoutFiles.find(layout => {
            // Match by source filename (basename only)
            const sourceBaseName = path.basename(layout.source);
            // Handle .rdl vs .rdlc difference
            const currentFileBase = currentFileName.replace(/\.(rdlc|rdl)$/i, '');
            const sourceFileBase = sourceBaseName.replace(/\.(rdlc|rdl)$/i, '');

            // Also check extensions for Word/Excel files
            if (currentFileName.toLowerCase() === sourceBaseName.toLowerCase()) {
              return true;
            }

            // For RDLC files, match base name (handles .rdl vs .rdlc)
            if ((currentFileName.match(/\.(rdlc|rdl)$/i) && sourceBaseName.match(/\.(rdlc|rdl)$/i)) &&
              currentFileBase === sourceFileBase) {
              return true;
            }

            return false;
          });

          if (matchingLayout) {
            // Use .rdl extension for rendering layouts (even though file is .rdlc)
            let targetFileName = matchingLayout.target;
            if (matchingLayout.type === 'rdlc') {
              targetFileName = targetFileName.replace(/\.rdlc$/i, '.rdl');
            }

            const newLine = `${indent}LayoutFile = '${layoutPath}${targetFileName}';`;
            if (lineText.trim() !== newLine.trim()) {
              edits.push({ line, newText: newLine });
              hasChanges = true;
            }
          }
        }
      }

      // Update DefaultRenderingLayout property
      if (lineText.includes('DefaultRenderingLayout =')) {
        const indent = lineText.match(/^\s*/)?.[0] || '\t';
        // Extract the layout name from the original line
        const layoutNameMatch = lineText.match(/DefaultRenderingLayout\s*=\s*"([^"]+)"/);
        if (layoutNameMatch) {
          const layoutName = layoutNameMatch[1];
          // Keep the layout name but ensure it matches our new file
          const newLine = `${indent}DefaultRenderingLayout = "${layoutName}";`;
          if (lineText.trim() !== newLine.trim()) {
            edits.push({ line, newText: newLine });
            hasChanges = true;
          }
        }
      }
    }

    // Apply all edits in one batch
    if (hasChanges && edits.length > 0) {
      const edit = new vscode.WorkspaceEdit();
      for (const { line, newText } of edits) {
        edit.replace(document.uri, line.range, newText);
      }
      await vscode.workspace.applyEdit(edit);
      await document.save();
    }
  }

  static async createReportExtensionFile(
    reportName: string,
    objectId: number,
    objectName: string,
    rdlcFileName: string,
    wordFileName: string,
    reportAlFolder?: string,
    reportLayoutFolder?: string
  ): Promise<string | undefined> {
    if (reportName === '') {
      return undefined;
    }

    let activeWorkSpaceFolder = getActiveWorkspacePath();
    if (activeWorkSpaceFolder === '') {
      return undefined;
    }

    // Use provided folder or find the report folder
    let reportFolder: string;
    if (reportAlFolder) {
      reportFolder = reportAlFolder;
    } else {
      reportFolder = FolderHelper.findReportFolder(activeWorkSpaceFolder) || activeWorkSpaceFolder;
    }

    // Use provided layout folder or default to report folder
    const layoutFolder = reportLayoutFolder || reportFolder;

    // Set file path and file content
    const fileExtension = '.al';
    const fileName = StringFunctions.removeSpecialCharsAndSpaces(objectName) + '.report';
    let reportFolderShort = stripReportFolder(reportFolder);
    const fileContent = reportTextBuilder.getReportExtensionFileContent(reportName, objectName, objectId, rdlcFileName, wordFileName, reportFolderShort);
    const filePath = path.join(reportFolder, fileName + fileExtension);

    try {
      await fs.promises.writeFile(filePath, fileContent);
      vscode.window.showInformationMessage(`File ${fileName}${fileExtension} created in folder ${reportFolder}.`);
      return filePath;
    } catch (error) {
      console.error('Error creating file:', error);
      vscode.window.showErrorMessage('Failed to create file.');
      return undefined;
    }
  }
}