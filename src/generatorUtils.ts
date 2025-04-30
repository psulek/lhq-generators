import { DOMParser as xmlDomParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import * as zodToJsonSchema from 'zod-to-json-schema';
import { fromZodError, createMessageBuilder } from 'zod-validation-error';

import { type LhqModel, LhqModelSchema } from './api/schemas';
import { isNullOrEmpty, iterateObject, objCount, replaceLineEndings, stringCompare, tryJsonParse, tryRemoveBOM } from './utils';
import type { CSharpNamespaceInfo, LhqValidationResult } from './types';
import type { GeneratedFile } from './api/types';
import type { IRootModelElement, LhqModelLineEndings } from './api';
import { RootModelElement } from './model/rootModelElement';
import type { XPathSelect } from 'xpath';

let DOMParser: typeof globalThis.DOMParser;

/**
 * Creates a new root element for the specified LHQ model data.
 * @param data - The LHQ model data to be used for creating the root element.
 * @returns  The created root element.
 */
export function createRootElement(data?: LhqModel): IRootModelElement {
    return new RootModelElement(data);
}

export function serializeRootElement(root: IRootModelElement): LhqModel {
    if (!(root instanceof RootModelElement)) {
        throw new Error('Invalid root element. Expected an object that was created by calling fn "createRootElement".');
    }

    const str = JSON.stringify(root.mapToModel());
    return JSON.parse(str) as LhqModel;
}

export function detectLineEndings(content: string): LhqModelLineEndings {
    const match = content.match(/\r\n|\n/);
    let lineEnding = match ? match[0] : ''
    if (lineEnding !== '\r\n' && lineEnding !== '\n') {
        lineEnding = '\r\n';
    }
    return lineEnding === '\r\n' ? 'CRLF' : 'LF';
}

export function serializeLhqModelToString(model: LhqModel, lineEndings: LhqModelLineEndings): string {
    return replaceLineEndings(JSON.stringify(model, null, 2), lineEndings);
}

/**
 * Validates the specified data (as JSON object or JSON as string) against the defined `LhqModel` schema.
 * @param data - The data (as JSON object or JSON as string) to validate.
 * @returns The validation result.
 */
export function validateLhqModel(data: LhqModel | string): LhqValidationResult {
    if (typeof data === 'string') {
        const parseResult = tryJsonParse(data, true);

        if (!parseResult.success) {
            return { success: false, error: parseResult.error };
        }

        data = parseResult.data as LhqModel;
    }

    if (data === undefined || data === null || typeof data !== 'object') {
        return { success: false, error: 'Specified "data" must be an object!' };
    }

    const parseResult = LhqModelSchema.safeParse(data);
    const success = parseResult.success && !isNullOrEmpty(parseResult.data);

    let error: string | undefined = undefined;
    if (!parseResult.success) {
        const messageBuilder = createMessageBuilder({
            prefix: '',
            prefixSeparator: '',
            issueSeparator: '\n'
        });
        const err = fromZodError(parseResult.error, { messageBuilder });
        error = err.toString();
    }

    return { success, error, model: success ? parseResult.data : undefined };
}

/**
 * Returns the content of the generated file with the appropriate line endings.
 * 
 * @param generatedFile - The generated file.
 * @param applyLineEndings - A flag indicating whether to apply line endings to the content. Line endings are determined by the `lineEndings` property of the `GeneratedFile`.
 * @returns The content of the generated file with the appropriate line endings.
 */
export function getGeneratedFileContent(generatedFile: GeneratedFile, applyLineEndings: boolean): string {
    if (!applyLineEndings || generatedFile.content.length === 0) {
        return generatedFile.content;
    }

    return replaceLineEndings(generatedFile.content, generatedFile.lineEndings);
}

/**
 * Generates the JSON schema (as string) for the `LhqModel` schema.
 * @returns The JSON schema as a string.
 */
export function generateLhqSchema(): string {
    const jsonSchema = zodToJsonSchema.zodToJsonSchema(LhqModelSchema, {
        name: 'LhqModel',
        $refStrategy: 'root'
    });

    return JSON.stringify(jsonSchema, null, 2);
}

// Constants and helper variables
const itemGroupTypes = ['None', 'Compile', 'Content', 'EmbeddedResource'];
const itemGroupTypesAttrs = ['Include', 'Update'];
const csProjectXPath = '//ns:ItemGroup/ns:##TYPE##[@##ATTR##="##FILE##"]';
const xpathRootNamespace = 'string(//ns:RootNamespace)';
const xpathAssemblyName = 'string(//ns:AssemblyName)';

/**
 * Retrieves the root namespace from a C# project file (.csproj).
 * @param lhqModelFileName - The full path of the `LHQ` model file (eg: `c:/Dir/Strings.lhq`).
 * @param t4FileName - The name of the T4 file associated with the `LHQ` model file (eg: `c:/Dir/Strings.lhq.tt`).
 * @param csProjectFileName - The name of the C# project file which using specified `lhqModelFileName`.
 * @param csProjectFileContent - The string content of the C# project file.
 * @returns An object `CSharpNamespaceInfo` containing the root namespace with other information or `undefined` 
 * if the project file is not valid or not information about namespace is found.
 */
export function getRootNamespaceFromCsProj(lhqModelFileName: string, t4FileName: string,
    csProjectFileName: string, csProjectFileContent: string): CSharpNamespaceInfo | undefined {
    let referencedLhqFile = false;
    let referencedT4File = false;
    let namespaceDynamicExpression = false;

    if (isNullOrEmpty(csProjectFileName) || isNullOrEmpty(csProjectFileContent)) {
        return undefined;
    }

    let rootNamespace: string | undefined;

    try {
        let xpathSelect: XPathSelect = undefined!;
        let rootNode: Node = undefined!;

        const fileContent = tryRemoveBOM(csProjectFileContent);
        if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
            // Running in a browser, use built-in DOMParser
            DOMParser = window.DOMParser;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            DOMParser = xmlDomParser as any;
        }

        const doc = new DOMParser().parseFromString(fileContent, 'text/xml');
        rootNode = doc as unknown as Node;
        const rootNs = doc.documentElement?.namespaceURI || '';
        const ns = isNullOrEmpty(rootNs) ? null : rootNs;

        xpathSelect = xpath.useNamespaces({ ns: rootNs });

        const findFileElement = function (fileName: string): Element | undefined {
            for (const itemGroupType of itemGroupTypes) {
                for (const attr of itemGroupTypesAttrs) {
                    const xpathQuery = csProjectXPath.replace('##TYPE##', itemGroupType)
                        .replace('##ATTR##', attr)
                        .replace('##FILE##', fileName);

                    const element = xpathSelect(xpathQuery, rootNode, true) as Element;
                    if (element) {
                        return element;
                    }
                }
            }
            return undefined;
        }

        // 1st: try to find <RootNamespace>
        rootNamespace = xpathSelect(xpathRootNamespace, rootNode, true) as string;

        referencedLhqFile = findFileElement(lhqModelFileName) != undefined;
        const t4FileElement = findFileElement(t4FileName);
        if (t4FileElement) {
            referencedT4File = true;
            const dependentUpon = t4FileElement.getElementsByTagNameNS(ns, 'DependentUpon')[0]?.textContent;
            if (dependentUpon && dependentUpon === lhqModelFileName) {
                referencedLhqFile = true;
            }

            const customToolNamespace = t4FileElement.getElementsByTagNameNS(ns, 'CustomToolNamespace')[0]?.textContent;
            if (customToolNamespace) {
                rootNamespace = customToolNamespace;
            }
        }

        if (!rootNamespace) {
            // 2st: try to find <AssemblyName>
            rootNamespace = xpathSelect(xpathAssemblyName, rootNode, true) as string;
        }

        if (!isNullOrEmpty(rootNamespace)) {
            const regexMsBuildProp = /\$\((.*?)(?:\)(?!\)))/g;
            const match = [...rootNamespace.matchAll(regexMsBuildProp)];
            namespaceDynamicExpression = match.length > 0;
        }
    } catch (e) {
        console.error('Error getting root namespace.', e);
        rootNamespace = undefined;
    }

    return { csProjectFileName, t4FileName, namespace: rootNamespace, referencedLhqFile, referencedT4File, namespaceDynamicExpression };
}

// type StringNullUndef = string | null | undefined;

// function getNamespaceProperties(xpathSelect: XPathSelect, rootNode: Node, msBuildProperties: Record<string, string>) {
//     const properties: Array<MsBuildProperty> = [];

//     const hasProperty = (propertyName: string, checkExist: boolean) => {
//         const prop = properties.find(p => stringCompare(p.name, propertyName, false));
//         return checkExist ? prop !== undefined && prop.exist !== undefined : prop !== undefined;
//     };

//     iterateObject(msBuildProperties, (value: string, key: string) => {
//         if (!hasProperty(key, false)) {
//             properties.push({ name: key, value, exist: true });
//         }
//     });

//     function populateProperties(propertyNames: string[], level: number) {
//         const regexMsBuildProp = /\$\((.*?)(?:\)(?!\)))/g;

//         const propCountBefore = properties.length;
//         propertyNames.forEach(propertyName => {
//             if (hasProperty(propertyName, true)) {
//                 return;
//             }

//             let propertyValue: StringNullUndef = undefined;
//             try {
//                 propertyValue = xpathSelect(`string(//ns:${propertyName})`, rootNode, true) as StringNullUndef;
//             } catch (error) {
//                 propertyValue = undefined;
//             }
//             const exist = propertyValue !== undefined && propertyValue !== null;
//             let valueMatch = exist ? [...propertyValue!.matchAll(regexMsBuildProp)] : undefined;
//             let linkToProperty: string | undefined = undefined;

//             // if property points to another property (itself or another), eg: <MyProp>$(MyProp)</MyProp>
//             // or <MyProp>$(MyProp2)</MyProp>
//             if (valueMatch && valueMatch.length > 0) {
//                 if (valueMatch.length === 1) {
//                     linkToProperty = valueMatch[0][1];

//                     if (stringCompare(valueMatch[0][0], valueMatch[0].input, false)) {
//                         valueMatch = undefined;
//                         // if value contains ref to itself, set value to ''
//                         if (stringCompare(linkToProperty, propertyName, false)) {
//                             propertyValue = '';
//                             linkToProperty = undefined;
//                         }
//                     }
//                 }
//             } else {
//                 valueMatch = undefined;
//             }

//             properties.push({ name: propertyName, value: propertyValue ?? '', exist, valueMatch, linkToProperty });
//         });

//         const linkedProperties: string[] = [];
//         properties.slice(propCountBefore).forEach(property => {
//             if (!isNullOrEmpty(property.linkToProperty) && !hasProperty(property.linkToProperty, true)) {
//                 linkedProperties.push(property.linkToProperty);
//             }

//             if (property.valueMatch && property.valueMatch.length > 0) {
//                 property.valueMatch.forEach(match => {
//                     let propertyName = match[1];
//                     // if contains . (dot) it can be expression like: $(MSBuildProjectName.Replace(" ", "_"))
//                     const dotIndex = propertyName.indexOf('.');
//                     if (dotIndex > -1) {
//                         propertyName = propertyName.substring(0, dotIndex);
//                     }

//                     // if value contains ref to itself, set value to ''
//                     if (!isNullOrEmpty(propertyName) && !stringCompare(propertyName, property.name, false) && !hasProperty(propertyName, true)) {
//                         linkedProperties.push(propertyName);
//                     }
//                 });
//             }
//         });

//         if (linkedProperties.length > 0) {
//             populateProperties(linkedProperties, level + 1);
//         }

//         if (level === 0) {
//             //console.log(properties);
//             properties.filter(p => !isNullOrEmpty(p.valueMatch))
//                 .forEach(property => {
//                     //const replacements: Record<string, string> = {};
//                     const replacements: string[] = [];

//                     property.valueMatch!.forEach(match => {
//                         let propertyName = match[1];
//                         // if contains . (dot) it can be expression like: $(MSBuildProjectName.Replace(" ", "_"))
//                         const dotIndex = propertyName.indexOf('.');
//                         const isExpression = dotIndex > -1;
//                         if (isExpression) {
//                             propertyName = propertyName.substring(0, dotIndex);
//                         }

//                         const prop = properties.find(p => stringCompare(p.name, propertyName, false));
//                         if (prop) {
//                             if (!isNullOrEmpty(prop.valueMatch) && prop.valueMatch.length > 0) {
//                                 throw new Error(`Circular reference in value for property "${property.name}"`);
//                             }

//                             let value = prop.value;
//                             if (isExpression) {
//                                 match[1].split('.');
//                             }

//                             replacements.push(value);
//                         } else {
//                             property.value = '';
//                         }
//                     });

//                     property.value = property.value.replace(regexMsBuildProp, (match, ...groups) => {

//                         return '';
//                     });

//                     /* if (objCount(replacements) > 0) {
//                         //property.value = property.value.replace()
//                         iterateObject
//                     } */
//                 });
//         }
//     }

//     populateProperties(['RootNamespace', 'AssemblyName'], 0);
// }

// type MsBuildProperty = {
//     name: string;
//     value: string;
//     valueMatch?: RegExpExecArray[] | undefined | null;
//     linkToProperty?: string | undefined;
//     exist?: boolean | undefined;
// }