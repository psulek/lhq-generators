import { DOMParser as xmlDomParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import type { CSharpNamespaceInfo, FileInfo, FindNamespaceOptions } from './types';
import { isNullOrEmpty, tryRemoveBOM } from './utils';

import type { XPathSelect } from 'xpath';

let DOMParser: typeof globalThis.DOMParser;

export function findNamespaceForModel(options: FindNamespaceOptions): CSharpNamespaceInfo | undefined {
    let namespaceInfo: CSharpNamespaceInfo | undefined = undefined;

    const { lhqModelFile, csProjectFiles, allowFileName = true } = options;

    const dir = lhqModelFile.dirname;
    const namespaceResults: Array<CSharpNamespaceInfo> = [];

    for (const csProj of csProjectFiles.filter(x => x.exist)) {
        const ttFile = lhqModelFile.basename + '.tt';
        const csProjContent = csProj.content as string;

        if (!isNullOrEmpty(csProjContent)) {
            const namespaceInfo = getRootNamespaceFromCsProj(lhqModelFile, ttFile, csProj, csProjContent);
            if (namespaceInfo) {
                namespaceResults.push(namespaceInfo);
            }
        }
    }

    if (namespaceResults.length > 1) {
        const mutileRefs = namespaceResults.filter(x => x.referencedLhqFile || x.referencedT4File).length;
        if (mutileRefs > 1) {
            const lhq = lhqModelFile.basename;
            const t4 = lhqModelFile.basename + '.tt';
            throw new Error(`Multiple C# project files found in directory '${dir}' that references either '${lhq}' or a '${t4}' file.\n` +
                `Specify which C# project file to use with the '--project' argument.`
            );
        }

        namespaceInfo = namespaceResults.find(x => (x.referencedLhqFile || x.referencedT4File) && !isNullOrEmpty(x.namespace));
        namespaceInfo = namespaceInfo || namespaceResults.find(x => !isNullOrEmpty(x.namespace)) || namespaceResults[0];
    } else if (namespaceResults.length === 1) {
        namespaceInfo = namespaceResults[0];
    }

    if (namespaceInfo?.namespaceDynamicExpression) {
        namespaceInfo.namespace = '';
        console.log(`Warning: Processing '${lhqModelFile.full}' and its '${namespaceInfo.csProjectFileName?.full ?? ''}' \nValue in 'RootNamespace' or 'AssemblyName' element contains dynamic expression which is not supported.\n` +
            `This value will not be used for 'Namespace' in generator.\n` +
            `Set namespace directly in the lhq file in C# template setting 'Namespace' or provide namespace via cmd '--data namespace=<value>'.`);
    }

    const csProjFileName = namespaceInfo?.csProjectFileName?.full ?? '';
    const namespace = namespaceInfo?.namespace ?? '';

    if (isNullOrEmpty(namespace) && namespaceInfo && allowFileName) {
        namespaceInfo.namespace = isNullOrEmpty(csProjFileName) ? '' : namespaceInfo.csProjectFileName.extless?.replace(' ', '_') ?? '';
    }
    
    return namespaceInfo;
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
export function getRootNamespaceFromCsProj(lhqModelFileName: FileInfo, t4FileName: string,
    csProjectFileName: FileInfo, csProjectFileContent: string): CSharpNamespaceInfo | undefined {
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

        referencedLhqFile = findFileElement(lhqModelFileName.basename) != undefined;
        const t4FileElement = findFileElement(t4FileName);
        if (t4FileElement) {
            referencedT4File = true;
            const dependentUpon = t4FileElement.getElementsByTagNameNS(ns, 'DependentUpon')[0]?.textContent;
            if (dependentUpon && dependentUpon === lhqModelFileName.basename) {
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