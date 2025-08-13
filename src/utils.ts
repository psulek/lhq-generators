import { search as jmespath } from 'jmespath';
import type { FormattingOptions, IndentationType, KeysMatching, LineEOL, TextEncodeOptions } from './types';
import type { LhqModelLineEndings } from '.';

import detectIndent from 'detect-indent';


// merge(`{"UseExpressionBodySyntax": false}`, CSharp)

const regexLF = new RegExp('\\r\\n|\\r', 'g');
const regexCRLF = new RegExp('(\\r(?!\\n))|((?<!\\r)\\n)', 'g');


const encodingCharMaps = {
    html: {
        '>': '&gt;',
        '<': '&lt;',
        '"': '&quot;',
        "'": '&apos;',
        '&': '&amp;'
    },
    xml: {
        '>': '&gt;',
        '<': '&lt;',
        '&': '&amp;'
    },
    xml_quotes: {
        '>': '&gt;',
        '<': '&lt;',
        '"': '&quot;',
        "'": '&apos;',
        '&': '&amp;'
    },
    json: {
        '\\': '\\\\',
        '"': '\\"',
        '\b': '\\b',
        '\f': '\\f',
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t'
    }
};

/**
 * Updates the line endings in a string based on the specified line endings.
 *
 * @param value - The string to process.
 * @param lineEndings - The desired line endings.
 * @returns The string with updated line endings.
 */
export function updateEOL(value: string, lineEndings: LineEOL): string {
    return (lineEndings === 'LF' || lineEndings === '\n')
        ? value.replace(regexLF, '\n')
        : value.replace(regexCRLF, '\r\n');
}


/**
 * Removes the Byte Order Mark (BOM) from a string if it exists.
 *
 * @param value - The string to process.
 * @returns The string without the BOM.
 */
export function tryRemoveBOM(value: string): string {
    return isNullOrEmpty(value) ? value : (value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value);
}

/**
 * Detects the indentation type (tabs or spaces) and amount in a string.
 *
 * @param text - The string to check for indentation.
 * @returns An object containing the type of indentation ('tab' or 'space') and the amount of indentation.
 */
export function detectIndentation(text: string): IndentationType {
    return detectIndent(text);
}

/**
 * Detects the formatting options (indentation and line endings) in a string.
 *
 * @param text - The string to check for formatting.
 * @returns An object containing the detected indentation and line endings.
 */
export function detectFormatting(text: string): FormattingOptions {
    if (text) {
        const indentation = detectIndentation(text);
        const lineEndings = detectLineEndings(text, 'LF') ?? 'LF';
        const eol = getLineEndingsRaw(lineEndings) ?? '\n';
        return { indentation, eol: eol as LineEOL };
    }

    return { indentation: { amount: 2, type: 'space' }, eol: '\n' };
}

/**
 * Detects the line endings in a string and returns the type of line endings used.
 *
 * @param text - The string to check for line endings.
 * @returns The type of line endings used in the string, either 'CRLF' or 'LF'.
 */
export function detectLineEndings(text: string, defaultValue: LhqModelLineEndings | undefined = 'CRLF'): LhqModelLineEndings | undefined {
    if (text) {
        const match = text.match(/\r\n|\n/);
        const lineEnding = match ? match[0] : ''
        if (lineEnding !== '\r\n' && lineEnding !== '\n') {
            return defaultValue;
        }
        return lineEnding === '\r\n' ? 'CRLF' : 'LF';
    }

    return undefined;
}

/**
 * Serializes a JSON object to a string with specified formatting options.
 *
 * @typeParam T - The type of the object to serialize.
 * @param value - The object to serialize.
 * @param options - The formatting options to use.
 * @returns The serialized JSON string.
 */
export function serializeJson<T>(value: T, options: FormattingOptions): string {
    const indentation = options.indentation;
    let indent = '  ';
    if (indentation) {
        if (indentation.indent === undefined) {
            const amount = typeof indentation.amount === 'number' ? indentation.amount : 2;
            const char = indentation.type === undefined ? ' ' : (indentation.type === 'space' ? ' ' : '\t');
            indent = char.repeat(amount);
        } else {
            indent = indentation.indent
        }
    }
    const eol = options.eol ?? '\n';
    return updateEOL(JSON.stringify(value, null, indent), eol);
}

/**
 * Returns the line endings based on the specified model line endings.
 *
 * @param modelLineEndings - The model line endings to use.
 * @returns The string representation of the line endings, either `\r\n` or `\n`.
 */
export function getLineEndingsRaw(modelLineEndings: LhqModelLineEndings): string {
    return modelLineEndings === 'CRLF' ? '\r\n' : '\n';
}

/**
 * Parses a JSON string and returns the parsed object or a default value if parsing fails.
 *
 * @typeParam T - The type of the parsed object.
 * @param value - The JSON string to parse.
 * @param defaultValue - The default value to return if parsing fails.
 * @param removeBOM - Whether to remove the BOM from the string before parsing.
 * @returns The parsed object or the default value.
 */
export function jsonParseOrDefault<T>(value: string, defaultValue: T, removeBOM: boolean = false): T {
    const { success, data: result } = tryJsonParse<T>(value, removeBOM);
    return success ? (result ?? defaultValue) : defaultValue;
}

/**
 * Tries to parse a JSON string and returns the result along with success status and error message.
 *
 * @typeParam T - The type of the parsed object.
 * @param value - The JSON string to parse.
 * @param removeBOM - Whether to remove the BOM from the string before parsing.
 * @returns An object containing success status, parsed data, and error message if any.
 */
export function tryJsonParse<T>(value: string, removeBOM: boolean = false): { success: boolean, data: T | undefined, error: string | undefined } {
    if (removeBOM) {
        value = tryRemoveBOM(value);
    }

    let result: T | undefined;
    let success = false;
    let error: string | undefined = undefined;

    if (!isNullOrEmpty(value)) {
        try {
            result = JSON.parse(value) as T;
            success = !isNullOrEmpty(result);
        } catch (e) {
            if (!isNullOrEmpty(e)) {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                error = e instanceof Error ? e.message : String(e);
            } else {
                error = 'Unknown error occurred';
            }
        }
    }

    return { success, data: result, error };
}

/**
 * Executes a JMESPath query on an object and returns the result or a default value.
 *
 * @typeParam T - The type of the query result.
 * @param obj - The object to query.
 * @param query - The `JMESPath` query string.
 * @param defaultValue - The default value to return if the query result is undefined.
 * @returns The query result or the default value.
 * @remarks This function uses the `jmespath` library to perform the query, more at https://jmespath.org/.
 */
export function jsonQuery<T>(obj: unknown, query: string, defaultValue?: T): T | undefined {
    return (jmespath(obj, query) as T | undefined) ?? defaultValue;
}

/**
 * Normalizes a file path by replacing backslashes with forward slashes, removing duplicate slashes, and trimming trailing slashes.
 *
 * @param path - The file path to normalize.
 * @returns The normalized file path.
 * @example
 *
 * const normalizedPath = normalizePath('C:\\path\\to\\file.txt');
 * console.log(normalizedPath); // Output: 'C:/path/to/file.txt'
 *
 * const normalizedPath2 = normalizePath('C:/path//to//file.txt/');
 * console.log(normalizedPath2); // Output: 'C:/path/to/file.txt'
 */
export function normalizePath(path: string): string {
    return path
        .replace(/\\/g, '/') // Replace backslashes with forward slashes
        .replace(/\/\//g, '/') // Remove duplicate forward slashes
        .replace(/[\\/]$/g, '') // Remove trailing forward or back slash
}

/**
 * Checks if a `value` is null, undefined or empty string.
 *
 * @typeParam T - The type of the value.
 * @param value - The value to check.
 *
 * @returns `true` if the value is null, undefined or empty string, `false` otherwise.
 */
export function isNullOrEmpty<T>(value: T | null | undefined | ''): value is undefined | null | '' {
    return value === null || value === undefined || value === '';
}

/**
 * Checks if a `value` is null or undefined.
 *
 * @typeParam T - The type of the value.
 * @param value - The value to check.
 *
 * @returns `true` if the value is null or undefined, `false` otherwise.
 */
export function isNullOrUndefined<T>(value: T | null | undefined): value is undefined | null {
    return value === null || value === undefined;
}

/**
 * Sorts an object by its keys in the specified order.
 * 
 * @param obj - The object to sort.
 * @param sortOrder - The order to sort the keys, either 'asc' or 'desc'.
 * @param locales - Optional locales argument for locale-aware sorting, default is 'en'.
 * @returns A new object with keys sorted in the specified order.
 * @remarks For sorting of keys, `localeCompare` is used with the specified `locales` to ensure correct sorting of strings.
 */
export function sortObjectByKey<T>(obj: Record<string, T>, sortOrder: 'asc' | 'desc' = 'asc',
    locales?: Intl.LocalesArgument): Record<string, T> {
    locales = locales ?? 'en';
    return Object.fromEntries(
        Object.entries(obj).sort(([a], [b]) =>
            sortOrder === 'asc' ? a.localeCompare(b, locales) : b.localeCompare(a, locales)
        )
    );
}

/**
 * Sorts an object by its values in the specified order using a predicate function.
 * 
 * @param obj - The object to sort.
 * @param predicate - A function that takes an item and returns a value to sort by.
 * @param sortOrder - The order to sort the values, either 'asc' or 'desc'.
 * @returns A new object with values sorted in the specified order.
 */
export function sortObjectByValue<T>(obj: Record<string, T>, predicate: (item: T) => number | string,
    sortOrder: 'asc' | 'desc' = 'asc'): Record<string, T> {

    return Object.fromEntries(Object.entries(obj).sort(([, a], [, b]) => {
        const aValue = predicate(a);
        const bValue = predicate(b);

        if (typeof aValue === 'number' || typeof bValue === 'number') {
            let res = 0;
            if (aValue > bValue) {
                res = 1;
            } else if (bValue > aValue) {
                res = -1;
            }
            return sortOrder === 'asc' ? res : res * -1;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return 0;
    }));
}

export function stringCompare(a: string, b: string, caseSensitive: boolean): boolean {
    if (caseSensitive) {
        return a === b;
    }
    return a.toLowerCase() === b.toLowerCase();
}

/**
 * Sorts an array of objects by a specified key in ascending or descending order.
 *
 * @typeParam T - The type of the objects in the array.
 * @param source - The array to sort.
 * @param key - The key to sort by. If undefined, the raw value is used.
 * @param sortOrder - The order to sort, either 'asc' for ascending or 'desc' for descending. Default is 'asc'.
 * @param mutate - Whether to mutate the original array or return a new sorted array. Default is `false` - returns a new array.
 * @returns A new array sorted by the specified key and order.
 */
export function sortBy<T>(source: T[], key: KeysMatching<T, string | number> | undefined, sortOrder: 'asc' | 'desc' = 'asc', mutate: boolean = false): T[] {
    // NOTE: dirty hack as unknown to be able to use raw x value when key is undefined
    return arraySortBy(source, x => (key === undefined ? x : x[key]) as unknown as number, sortOrder, mutate);
}

/**
 * Inserts an item into a sorted array at the correct position.
 *
 * @typeParam T - The type of the items in the array.
 * @param list - The array to insert into.
 * @param item - The item to insert.
 * @param comparer - Optional comparer function. Should return negative if `a < b`, zero if a == b, positive if a `> b`.
 * @returns The index at which the item was inserted.
 */
export function arrayAddSorted<T>(list: T[],item: T, comparer: ValueComparerPredicate<T> = DefaultValueComparer): number {
    const index = getIndexForSortedAdd(list, item, comparer);
    list.splice(index, 0, item);
    return index;
}

/**
 * Sorts an array by a predicate function in ascending or descending order.
 *
 * @typeParam T - The type of the objects in the array.
 * @param source - The array to sort.
 * @param predicate - A function that returns the value to sort by.
 * @param sortOrder - The order to sort, either 'asc' for ascending or 'desc' for descending. Default is 'asc'.
 * @param mutate - Whether to mutate the original array or return a new sorted array. Default is `false` - returns a new array.
 * @returns A new array sorted by the predicate function and order.
 */
export function arraySortBy<T>(source: T[], predicate: (item: T) => number | string, sortOrder: 'asc' | 'desc' = 'asc', mutate: boolean = false): T[] {
    const result = mutate ? source : [...source];
    return result.sort((a, b) => {
        const v1 = predicate(a);
        const v2 = predicate(b);
        const res = v1 > v2 ? 1 : ((v2 > v1) ? -1 : 0);
        return sortOrder === 'asc' ? res : res * -1;
    });
}

/**
 * Iterates over an object's key-value pairs and executes a callback function for each pair.
 *
 * @typeParam T - The type of the values in the object.
 * @param obj - The object to iterate over.
 * @param callback - A function to execute for each key-value pair. Receives the value, key, index, and a boolean indicating if it's the last pair.
 */
export function iterateObject<T>(obj: Record<string, T>, callback:
    (value: T, key: string, index: number, isLast: boolean) => void): void {

    const entries = Object.entries(obj);
    if (entries.length > 0) {
        const lastIndex = entries.length - 1;
        let index = -1;
        for (const [key, value] of entries) {
            index++;
            callback(value, key, index, (index == lastIndex));
        }
    }
}

/**
 * Encodes a string based on the specified encoding options.
 *
 * @param str - The string to encode.
 * @param encoder - The encoding options.
 * @returns The encoded string.
 */
export function textEncode(str: string, encoder: TextEncodeOptions): string {
    if (isNullOrEmpty(str)) {
        return str;
    }

    const encodedChars: string[] = [];
    for (let i = 0; i < str.length; i++) {
        const ch = str.charAt(i);

        let map: Record<string, string> = undefined!;
        if (encoder.mode === 'html') {
            map = encodingCharMaps.html;
        } else if (encoder.mode === 'xml') {
            map = (encoder.quotes ?? true) ? encodingCharMaps.xml_quotes : encodingCharMaps.xml;
        } else {
            map = encodingCharMaps.json;
        }

        if (Object.prototype.hasOwnProperty.call(map, ch)) {
            encodedChars.push(map[ch]);
        } else {
            encodedChars.push(ch);
        }
    }

    return encodedChars.join('');
}


/**
 * Returns the value of `value` or `defaultValue` if `value` is null, undefined (or optionally empty string)
 * @param value - value to check and potentially return
 * @param defaultValue - default value to return if `value` is null, undefined (or optionally empty string)
 * @param defaultOnEmptyString - whether to return `defaultValue` if `value` is an empty string
 * @returns the value of `value` or `defaultValue`.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export function valueOrDefault<T>(value: T | null | undefined | '' | unknown, defaultValue: T, defaultOnEmptyString: boolean = false): T {
    defaultOnEmptyString = defaultOnEmptyString ?? false;
    return defaultOnEmptyString
        ? isNullOrEmpty(value) ? defaultValue : value as T
        : isNullOrUndefined(value) ? defaultValue : value as T;
}

/**
 * Checks if an object or array has any items.
 *
 * @typeParam T - The type of the items in the object or array.
 * @param obj - The object or array to check.
 * @returns `true` if the object or array has items, `false` otherwise.
 */
export function hasItems<T>(obj: Record<string, T> | Array<T> | undefined): boolean {
    return objCount(obj) > 0;
}


// /**
//  * Copies an object while skipping specified keys.
//  *
//  * @typeParam T - The type of the object.
//  * @typeParam K - The type of the keys to skip.
//  * @param obj - The object to copy.
//  * @param keysToSkip - The keys to skip while copying.
//  * @returns A new object with the specified keys skipped.
//  */
// export function copyObject<T extends Record<string, unknown>, K extends keyof T>(obj: T, keysToSkip?: K[]): T | Omit<T, K> {
//     if (!keysToSkip || keysToSkip.length === 0) {
//         return { ...obj };
//     }
//     return Object.fromEntries(
//         Object.entries(obj).filter(([key]) => !keysToSkip.includes(key as K))
//     ) as Omit<T, K>;
// }

/**
 * Counts the number of items in an object or array.
 *
 * @typeParam T - The type of the items in the object or array.
 * @param obj - The object or array to count items from.
 * @returns The number of items in the object or array, or `0` if null or undefined.
 */
export function objCount<T>(obj: Record<string, T> | Array<T> | undefined): number {
    if (isNullOrEmpty(obj)) {
        return 0;
    }

    if (Array.isArray(obj)) {
        return obj.length;
    }

    if (typeof obj === 'object') {
        return Object.keys(obj).length;
    }

    return 0;
}

/**
 * Removes new line characters from a string.
 *
 * @param input - The string to process.
 * @returns The string without new line characters.
 */
export function removeNewLines(input: string): string {
    if (isNullOrEmpty(input)) return input;
    return input.replace(/\r\n|\r|\n/g, '');
}

/**
 * Removes specified properties from an object.
 *
 * @typeParam T - The type of the object.
 * @param obj - The object to modify.
 * @param propertiesToRemove - The properties to remove from the object.
 * @returns The modified object with specified properties removed.
 * @example
 *
 * const obj = \{ a: 1, b: 2, c: 3 \};
 * const modifiedObj = removeProperties(obj, \{ b: true \}, \{c: true \});
 * console.log(modifiedObj); // \{ a: 1 \}
 * 
 */
export function removeProperties<T>(obj: T | undefined, ...propertiesToRemove: object[]): T | undefined {
    if (isNullOrUndefined(obj)) return obj;

    propertiesToRemove.forEach(propObj => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for (const key in propObj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                delete obj[key];
            }
        }
    });

    return obj;
}

export function strCompare(str1: string | undefined, str2: string | undefined, ignoreCase: boolean = false): boolean {
    if ((str1 === undefined && str2 !== undefined) || (str2 === undefined && str1 !== undefined)) {
        return false;
    }

    if (str1 === undefined && str2 === undefined) {
        return true;
    }

    if (ignoreCase) {
        //return str1!.localeCompare(str2!, 'en-US', { sensitivity: 'base' }) === 0;
        return str1!.toLowerCase() === str2!.toLowerCase();
    } else {
        return str1 === str2;
    }
}

export type ValueComparerPredicate<T> = (a: T, b: T, ignoreCase: boolean) => number;

export const DefaultValueComparer = <T>(a: T, b: T, ignoreCase: boolean = true): number => {
    if (a === b) return 0;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a === 'string' && typeof b === 'string') {
        if (ignoreCase) {
            const aStr = (a as string).toLowerCase();
            const bStr = (b as string).toLowerCase();
            return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        }
        return a < b ? -1 : 1;
    }
    const av = (a as unknown)?.valueOf?.() ?? a;
    const bv = (b as unknown)?.valueOf?.() ?? b;
    if (av === bv) return 0;
    return av < bv ? -1 : 1;
};

export function getIndexForSortedAdd<T>(list: T[], item: T, comparer?: ValueComparerPredicate<T>, ignoreCase: boolean = true): number {
    comparer = comparer ?? DefaultValueComparer;
    let index = 0;
    while (index < list.length && comparer(list[index], item, ignoreCase) < 0) {
        index++;
    }
    return index;
}