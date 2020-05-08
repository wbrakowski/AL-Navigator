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

    // Levenshtein Distance
    export function LevenshteinDistance(s: string, t: string): number
    {
        let n = s.length;
        let m = t.length;

        let d: number[][] = [[n+1],[m+1]];

        // Step 1
        if (n === 0) {
            return m;
        }

        if (m === 0) {
            return n;
        }

        // Step 2
        // for (let i = 0; i <= n; d[i][0] = i++)
        // {
        // }

        // for (let j = 0; j <= m; d[0][j] = j++)
        // {
        // }

        // Step 3
        for (let i = 1; i <= n; i++)
        {
            //Step 4
            for (let j = 1; j <= m; j++)
            {
                // Step 5
               let cost = (t[j - 1] === s[i - 1]) ? 0 : 1;

                // Step 6
                d[i][j] = Math.min(
                    Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1),
                    d[i - 1][j - 1] + cost);
            }
        }
        // Step 7
        return d[n][m];
    }

    export function titleCaseWord(word: string) {
        if (!word) {
            return word;
        }
        return word[0].toUpperCase() + word.substr(1).toLowerCase();
      }
}