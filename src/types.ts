import type { LhqModel, LhqModelLineEndings } from './api/schemas';
//import type detectIndent from 'detect-indent';

export type IndentationType = {
	/**
	The type of indentation.

	It is `undefined` if no indentation is detected.
	*/
	type?: 'tab' | 'space' | undefined;

	/**
	The amount of indentation. For example, `2`.
	*/
	amount?: number;

	/**
	The actual indentation.
	*/
	indent?: string;
}


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

export type LineEOL = LhqModelLineEndings | '\r\n' | '\n';

export type FormattingOptions = {
    indentation?: IndentationType;
    eol: LineEOL;
}