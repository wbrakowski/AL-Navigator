export module reportTextBuilder {

    export function getReportExtensionFileContent(reportName: string, rdlcFileName: string, wordFileName: string, reportFolder: string): string {
        let fileContent = '';

        fileContent += addHeaderBlock(reportName);
        fileContent += getLineBreak(1);
        fileContent += getCurlyOpenParanthesis();
        fileContent += getLineBreak(1);
        fileContent += getTab();
        if (rdlcFileName !== '') {
            fileContent += getRDLCLayout(rdlcFileName, reportFolder);
        }
        fileContent += getLineBreak(1);
        fileContent += getTab();
        if (wordFileName !== '') {
            fileContent += getWordLayout(wordFileName, reportFolder);
        }
        fileContent += getLineBreak(1);
        fileContent += getTab();
        fileContent += getDatasetSection();
        fileContent += getLineBreak(1);
        fileContent += getCurlyCloseParanthesis();

        return fileContent;
    }

    function addHeaderBlock(reportName: string): string {
        return `reportextension Id "${reportName}" extends "${reportName}"`;
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

function getRDLCLayout(rdlcFileName: string, reportFolder: string): string {
    return `RDLCLayout = '${reportFolder}${rdlcFileName}';`;
}

function getWordLayout(wordFileName: string, reportFolder: string): string {
    return `WordLayout = '${reportFolder}${wordFileName}';`;
}

