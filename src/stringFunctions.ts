export module StringFunctions {
    export function removeDoubleQuotesFromString(text : string) : string {
        return text.replace(/"/g,"");
    }
    
    export function getNoOfLeftSpaces(text: string): number {
        return text.search(/\S|$/);
    }

    export function removeSpecialChars(text: string): string {
        return(text.replace(/[^a-zA-Z]/g, ""));
    }

    export function containsSpecialChars(text: string) : boolean {
        return(text.includes(" ") || text.includes("+") || text.includes("/") || text.includes("-"));
    }
}