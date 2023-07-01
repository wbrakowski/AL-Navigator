export module reportTextBuilder {

    export function getRDLCLayoutBlock(rdlcFileName: string, reportFolder: string): string {
        return `RDLCLayout = '${reportFolder}${rdlcFileName}';`;
    }

    export function getWordLayoutBlock(wordFileName: string, reportFolder: string): string {
        return `WordLayout = '${reportFolder}${wordFileName}';`;
    }

    export function getReportExtensionFileContent(reportName: string, objectName: string, objectId: number, rdlcFileName: string, wordFileName: string, reportFolder: string): string {
        let fileContent = '';

        fileContent += addHeaderBlock(reportName, objectName, objectId);
        fileContent += getLineBreak(1);
        fileContent += getCurlyOpenParanthesis();
        fileContent += getLineBreak(1);
        fileContent += getTab();
        if (rdlcFileName !== '') {
            fileContent += getRDLCLayoutBlock(rdlcFileName, reportFolder);
        }
        fileContent += getLineBreak(1);
        fileContent += getTab();
        if (wordFileName !== '') {
            fileContent += getWordLayoutBlock(wordFileName, reportFolder);
        }
        fileContent += getLineBreak(1);
        fileContent += getTab();
        fileContent += getDatasetSection();
        fileContent += getLineBreak(1);
        fileContent += getCurlyCloseParanthesis();

        return fileContent;
    }

    function addHeaderBlock(reportName: string, objectName: string, objectId: number): string {
        return `reportextension ${objectId} "${objectName}" extends "${reportName}"`;
    }

    function getWhitespaces(count: number): string {
        return ' '.repeat(count);
    }

    function getSemicolon(): string {
        return ';';
    }

    function getDatasetSection(): string {
        let section = 'dataset';
        section += getLineBreak(1);
        section += getTab();
        section += getCurlyOpenParanthesis();
        section += getLineBreak(2);
        section += getTab();
        section += getCurlyCloseParanthesis();
        section += getLineBreak(1);
        return section;
    }

}

function getLineBreak(count: number): string {
    return '\n'.repeat(count);
}
function getTab(): string {
    return '\t';
}

function getCurlyOpenParanthesis(): string {
    return '{';
}

function getCurlyCloseParanthesis(): string {
    return '}';
}


