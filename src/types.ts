import type { IRootModelElement, ITreeElementPaths } from './api';
import type { LhqModel, LhqModelLineEndings } from './api/schemas';
import type { TemplatesMetadata } from './api/templates';

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
}

export type GeneratorInitialization = {
    /**
     * Handlebars templates, where each key represents 'templateId' (unique identifier) and value represents handlebars template content.
     */
    hbsTemplates: HbsTemplatesData;

    /**
     * Metadata of available templates, including settings and templates definitions.
     */
    templatesMetadata: TemplatesMetadata;

    /**
     * Host environment with which generator interacts when running code templates.
     */
    hostEnvironment: IHostEnvironment;
}

/**
 * Represents the result of a model validation.
 */
export type LhqValidationResult = {
    /**
     * Indicates whether the validation was successful.
     */
    success: boolean;

    /**
     * Represents the error message if the validation failed or
     * `undefined` if the validation was successful.
     */
    error: string | undefined;

    /**
     * Represents the validated LHQ model if the validation was successful.
     */
    model?: LhqModel;
}

/**
 * Represents the result of a model upgrade.
 */
export type UpgradeModelResult = {
    /**
     * Indicates whether the upgrade was successful.
     */
    success: boolean;

    /**
     * Represents the error message if the upgrade failed or
     * `undefined` if the upgrade was successful.
     */
    error: string | undefined;

    /**
     * Represents the upgraded LHQ model if the upgrade was successful.
     */
    // model?: LhqModel;

    rootModel?: IRootModelElement;
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

export type ImportModelErrorKind = 'emptyModel' | 'categoriesForFlatStructure' | 'noResourcesToMerge';
export type ImportModelMode = 'merge' | 'importAsNew';

/**
 * Options for importing a model into another model, used in `ModelUtils.importModel` method.
 */
export type ImportModelOptionsBase = {
    /**
     * Allows importing new languages that are not present in the source model.
     * @defaultValue `true`
     */
    importNewLanguages?: boolean;

    /**
     * Allows importing new categories/resources that are not present in the source model.
     * @defaultValue `true`
     */
    importNewElements?: boolean;

    /**
     * If set to true, source `model` will be cloned before import, otherwise it will be imported directly into source `model`.
     * Default is `true`.
     */
    cloneSource?: boolean;

    /**
     * If set to `true`, the import will throw an error if the source model contains invalid names, 
     * otherwise it will skip importing element(s) with invalid name.
     * @defaultValue `false`
     */
    throwOnInvalidName?: boolean
}

export type ImportModelOptions = {
    sourceKind: 'model';
    source: IRootModelElement;
} & ImportModelOptionsBase | {
    sourceKind: 'rows';
    source: ImportResourceItem[];
} & ImportModelOptionsBase;


/**
 * Result of importing a model into another model, used in `ModelUtils.importModel` method.
 */
export type ImportModelResult = {
    /**
     * Contains the error message if the import failed or `undefined` if the import was successful.
     */
    error?: string;

    /**
     * Contains the kind of error if the import failed, or `undefined` if the import was successful.
     */
    errorKind?: ImportModelErrorKind;

    /**
     * Contains the number of new categories added during the import.
     */
    newCategories: number;

    /**
     * Contains the number of categories updated during the import.
     */
    updateCategories: number;

    /**
     * Contains the number of new resources added during the import.
     */
    newResources: number;

    /**
     * Contains the number of resources updated during the import.
     */
    updateResources: number;

    /**
     * Contains the number of new languages added during the import.
     */
    newLanguages: number;

    /**
     * When `options.cloneSource` is set to `true`, this contains the cloned source model otherwise it contains the original source model.
     */
    resultModel: IRootModelElement;

    /**
     * Contains the paths of the new categories added during the import.
     * Only present if `mode` is `importAsNew`.
     */
    newCategoryPaths?: ITreeElementPaths;
}

export type ImportResourceItem = {
    paths: ITreeElementPaths;
    values: Array<{ language: string, value: string }>;
}