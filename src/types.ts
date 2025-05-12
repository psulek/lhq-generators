import type { LhqModel } from './api/schemas';

export type HbsTemplatesData = {
    [templateId: string]: string;
};

export type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

export interface IHostEnvironment {
    debugLog(msg: string): void;
    webHtmlEncode(input: string): string;
    stopwatchStart(): number;
    stopwatchEnd(start: number): string;
    pathCombine(path1: string, path2: string): string;
    //readonly path: IPathProvider;
}

// export interface IPathProvider {
//     join(path1: string, path2: string): string;
//     exist(path: string): boolean;
//     dirname(path: string): string;
//     basename(path: string): string;
//     ext(path: string): string;
//     find(pattern: string, options: { cwd: string, nodir: boolean }): string[];
// }

export type GeneratorInitialization = {
    /**
     * Handlebars templates, where each key represents 'templateId' (unique identifier) and value represents handlebars template content.
     */
    hbsTemplates: HbsTemplatesData;

    /**
     * Host environment with which generator interacts when running code templates.
     */
    hostEnvironment: IHostEnvironment;
}

/**
 * Represents the result of a model validation.
 */
export type LhqValidationResult = {
    success: boolean, error: string | undefined, model?: LhqModel;
}

export type CSharpNamespaceInfo = {
    csProjectFileName: FileInfo;
    t4FileName: string;
    namespace: string | undefined;
    referencedLhqFile: boolean;
    referencedT4File: boolean;
    namespaceDynamicExpression: boolean;
};

export type TextEncodeOptions =
    { mode: 'html' } |
    { mode: 'xml', quotes: boolean } |
    { mode: 'json' };

export type TextEncodeModes = Extract<TextEncodeOptions, { mode: unknown }>['mode'];

export type FileInfo = {
    exist: boolean;
    full: string;
    ext: string;
    extless: string;
    relative?: string;
    dirname: string;
    basename: string;
    content?: string | Buffer;
}

export type ReadFileInfoOptions = {
    fileMustExist?: boolean;
    rootFolder?: string | FileInfo;
    formatRelative?: boolean;
    loadContent?: boolean;
    encoding?: BufferEncoding;
}

// export type FindFilesOptions = {
//     cwd: string;
//     nodir?: boolean;
//     loadfile?: {
//         enabled?: boolean;
//         encoding?: string;
//     };
// };

// export type FoundedFile = FileInfo & {
//     content?: string | Buffer;
// };

// export type FindFilesCallback = (pattern: string, options: FindFilesOptions) => Promise<FoundedFile[]>;