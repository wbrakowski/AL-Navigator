export module StringFunctions {
    export function removeDoubleQuotesFromString(text : string) : string {
        return text.replace(/"/g,"");
    }
}