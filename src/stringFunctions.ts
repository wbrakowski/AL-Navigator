export module StringFunctions {
    export function removeDoubleQuotesFromString(text : string) : string {
        return text.replace(/"/g,"");
    }
    
    export function getNoOfLeftSpaces(text: string): number {
        return text.search(/\S|$/);
    }
}