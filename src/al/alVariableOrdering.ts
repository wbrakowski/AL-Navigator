import { ALDataTypes } from "./alDataTypes";

/**
 * Helper module for AL variable ordering according to Microsoft's AL Language specification.
 * 
 * Variable declarations should be ordered by type. Object and complex variable types are listed first 
 * followed by simple variables.
 * 
 * The order is: Record, Report, Codeunit, XmlPort, Page, Query, Notification, BigText, DateFormula, 
 * RecordId, RecordRef, FieldRef, and FilterPageBuilder. The rest of the variables are not sorted.
 */
export module ALVariableOrdering {

    /**
     * Defines the order of AL variable types according to AL specification.
     * Lower index = should appear earlier in var section.
     * Types not in this array are considered "unsorted" and should appear after sorted types.
     */
    const VARIABLE_TYPE_ORDER: string[] = [
        ALDataTypes.Record,
        ALDataTypes.Report,
        ALDataTypes.Codeunit,
        ALDataTypes.XmlPort,
        ALDataTypes.Page,
        ALDataTypes.Query,
        ALDataTypes.Notification,
        ALDataTypes.BigText,
        ALDataTypes.DateFormula,
        ALDataTypes.RecordId,
        ALDataTypes.RecordRef,
        ALDataTypes.FieldRef,
        ALDataTypes.FilterPageBuilder
    ];

    /**
     * Gets the sort priority for a given variable type.
     * @param variableType The AL variable type (e.g., "Record", "Integer", "Text")
     * @returns A number representing the sort priority. Lower numbers should appear first.
     *          Types in VARIABLE_TYPE_ORDER get their index (0-12).
     *          Unsorted types get 1000 to appear after sorted types.
     */
    export function getVariableTypeSortPriority(variableType: string): number {
        const upperType = variableType.toUpperCase();
        const index = VARIABLE_TYPE_ORDER.findIndex(t => t.toUpperCase() === upperType);

        // If type is in the ordered list, return its index
        // Otherwise return a high number (1000) so it appears after ordered types
        return index >= 0 ? index : 1000;
    }

    /**
     * Compares two variable types for sorting.
     * @param typeA First variable type
     * @param typeB Second variable type
     * @returns Negative if typeA should come before typeB, positive if after, 0 if equal priority
     */
    export function compareVariableTypes(typeA: string, typeB: string): number {
        const priorityA = getVariableTypeSortPriority(typeA);
        const priorityB = getVariableTypeSortPriority(typeB);
        return priorityA - priorityB;
    }

    /**
     * Checks if a variable type is in the sorted category (should be ordered).
     * @param variableType The AL variable type to check
     * @returns True if the type should be sorted according to AL rules
     */
    export function isSortedType(variableType: string): boolean {
        return getVariableTypeSortPriority(variableType) < 1000;
    }
}
