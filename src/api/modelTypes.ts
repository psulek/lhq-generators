import type {
    LhqModelOptions,
    LhqModelResourceTranslationState, LhqModelUid, LhqModelVersion, LhqModelMetadata,
    LhqCodeGenVersion,
    LhqModelLineEndings,
    LhqModelDataNode
} from './schemas';

export type TreeElementType = 'model' | 'category' | 'resource';

/**
 * Represents a tree element (root, category or resource) from `*.lhq` model file.
 */
export interface ITreeElement {
    /**
     * Gets the parent of the current tree element.
     * @remarks
     * For resource element, it will be category.
     * For category element, it will be either another category or root.
     * For root element, it will be undefined.
     */
    get parent(): Readonly<ICategoryLikeTreeElement | undefined>;

    /**
     * Gets the root of the tree.
     */
    get root(): Readonly<IRootModelElement>;

    /**
     * Gets the name of the tree element.
     */
    get name(): string;

    /**
     * Sets the name of the tree element.
     */
    set name(value: string);

    /**
     * Type of the tree element.
     */
    get elementType(): TreeElementType;

    /**
     * Gets the description of the tree element.
     */
    get description(): string | undefined;

    /**
     * Sets the description of the tree element.
     */
    set description(value: string | undefined);

    /**
     * Gets paths information of the tree element.
     */
    get paths(): Readonly<ITreeElementPaths>;

    /**
     * Flag indicating if the tree element is a root element.
     */
    get isRoot(): boolean;

    /**
     * Temp data dictionary (is not stored in lhq model file).
     * @remarks
     * e.g. Generator using this data to store temporary data defined dynamically by template run, resets on each template run.
     */
    get data(): Readonly<Record<string, unknown>>;
}

/**
 * Represents a category-like tree element.
 */
export interface ICategoryLikeTreeElement extends ITreeElement {
    /**
     * List of child categories.
     */
    get categories(): Readonly<ICategoryElement[]>;

    /**
     * List of resources under this category.
     */
    get resources(): Readonly<IResourceElement[]>;

    /**
     * Indicates whether the category has child categories.
     */
    get hasCategories(): boolean;

    /**
     * Indicates whether the category has resources.
     */
    get hasResources(): boolean;

    /**
     * Add new category to categories list.
     * @param category - The category to add.
     */
    addCategory(category: ICategoryElement): void;

    /**
     * Removes a category from the categories list.
     * @param name - The name of the category to remove.
     */
    removeCategory(name: string): void;

    /**
     * Add new resource to resources list.
     * @param resource - The resource to add.
     */
    addResource(resource: IResourceElement): void;

    /**
     * Removes a resource from the resources list.
     * @param name - The name of the resource to remove.
     */
    removeResource(name: string): void;
}

/**
 * Basic settings for the code generator.
 */
export interface CodeGeneratorBasicSettings {
    /**
     * Path to the output folder.
     */
    OutputFolder: string;

    /**
     * Name of the output project (optional).
     */
    OutputProjectName?: string;

    /**
     * Indicates whether the encoding includes a BOM.
     */
    EncodingWithBOM: boolean;

    /**
     * Line endings format.
     */
    LineEndings: LhqModelLineEndings;

    /**
     * Indicates whether the code generator is enabled.
     */
    Enabled: boolean;
}

/**
 * Represents a code generator element.
 */
export interface ICodeGeneratorElement {
    /**
     * Identifier of the template used by the code generator.
     */
    readonly templateId: string;

    // TODO: Must add 'version' for code generator templates in v3 of LHQ model file format!!
    // for now this value will be artificially set to 1 (not stored in lhq model file)
    readonly version: LhqCodeGenVersion;

    /**
     * Settings for the code generator.
     */
    readonly settings: LhqModelDataNode;
}

/**
 * Represents the root model element.
 */
export interface IRootModelElement extends ICategoryLikeTreeElement {
    /**
     * Unique identifier of the root model element.
     */
    get uid(): LhqModelUid;

    /**
     * Version of the root model element.
     */
    get version(): LhqModelVersion;

    /**
     * Gets the description of the root model element.
     */
    get description(): string | undefined;

    /**
     * Sets the description of the root model element.
     */
    set description(value: string); 

    /**
     * Gets the options for the root model element.
     */
    get options(): LhqModelOptions;

    /**
     * Sets the options for the root model element.
     */
    set options(value: LhqModelOptions);

    /**
     * Gets the primary language of the root model element.
     */
    get primaryLanguage(): string;

    /**
     * Sets the primary language of the root model element.
     */
    set primaryLanguage(value: string);

    /**
     * Gets the list of languages supported by the root model element.
     */
    get languages(): Readonly<string[]>;

    /**
     * Sets the list of languages supported by the root model element.
     */
    set languages(value: string[]);

    /**
     * Indicates whether the root model element has languages defined.
     */
    get hasLanguages(): boolean;

    /**
     * Gets the metadata associated with the root model element (optional).
     */
    get metadatas(): Readonly<LhqModelMetadata> | undefined;

    /**
     * Sets the metadata for the root model element.
     */
    set metadatas(value: LhqModelMetadata);

    /**
     * Code generator associated with the root model element (optional).
     */
    get codeGenerator(): ICodeGeneratorElement | undefined;

    /**
     * Sets the code generator for the root model element.
     */
    set codeGenerator(value: ICodeGeneratorElement);
}

/**
 * Represents a category element.
 */
export type ICategoryElement = ICategoryLikeTreeElement;

/**
 * Represents a resource element.
 */
export interface IResourceElement extends ITreeElement {
    /**
     * Gets the translation state of the resource element.
     */
    get state(): LhqModelResourceTranslationState;

    /**
     * Sets the translation state of the resource element.
     */
    set state(value: LhqModelResourceTranslationState);

    /**
     * Gets the list of parameters for the resource element.
     */
    get parameters(): Readonly<IResourceParameterElement[]>;

    /**
     * Sets the list of parameters for the resource element.
     */
    set parameters(value: IResourceParameterElement[]);

    /**
     * Gets the list of values for the resource element.
     */
    get values(): Readonly<IResourceValueElement[]>;

    /**
     * Sets the list of values for the resource element.
     */
    set values(value: IResourceValueElement[]);

    /**
     * Gets the comment associated with the resource element.
     */
    get comment(): string;

    /**
     * Sets the comment for the resource element.
     */
    set comment(value: string);

    /**
     * Indicates whether the resource element has parameters defined.
     */
    get hasParameters(): boolean;

    /**
     * Indicates whether the resource element has values defined.
     */
    get hasValues(): boolean;

    /**
     * Retrieves the value of the resource element for a specific language.
     * @param language - The language for which to retrieve the value.
     * @param trim - Whether to trim the value (optional).
     * @returns The value of the resource element for the specified language.
     */
    getValue(language: string, trim?: boolean): string;

    /**
     * Checks if the resource element has a value for a specific language.
     * @param language - The language to check.
     * @returns True if the resource element has a value for the specified language, otherwise false.
     */
    hasValue(language: string): boolean;

    /**
     * Adds new parameter to the resource element.
     * @param parameter - The resource parameter to add.
     */
    addParameter(parameter: IResourceParameterElement): void;

    /**
     * Removes a parameter from the resource element.
     * @param name - The name of the parameter to remove.
     */
    removeParameter(name: string): void;

    /**
     * Adds new resource value to the resource element.
     * @param value - The resource value to add.
     */
    addValue(value: IResourceValueElement): void;

    /**
     * Removes a resource value specified by `language` from the resource element.
     * @param language - The language of the resource value to remove.
     */
    removeValue(language: string): void;
}

/**
 * Represents a resource parameter element.
 */
export interface IResourceParameterElement {
    /**
     * Gets the name of the resource parameter.
     */
    get name(): string;

    /**
     * Sets the name of the resource parameter.
     */
    set name(value: string);

    /**
     * Gets the description of the resource parameter (optional).
     */
    get description(): string | undefined;

    /**
     * Sets the description of the resource parameter.
     */
    set description(value: string);

    /**
     * Gets the order of the resource parameter.
     */
    get order(): number;

    /**
     * Sets the order of the resource parameter.
     */
    set order(value: number);

    /**
     * Gets the parent resource element of the parameter.
     */
    get parent(): Readonly<IResourceElement>;
}

/**
 * Represents a resource value element.
 */
export interface IResourceValueElement {
    /**
     * Name of the language for the resource value.
     */
    get languageName(): string;

    /**
     * Value of the resource (optional).
     */
    get value(): string | undefined;

    /**
     * Sets the value of the resource value.
     */
    set value(value: string);

    /**
     * Indicates whether the resource value is locked (optional).
     */
    get locked(): boolean | undefined;

    /**
     * Sets the locked state of the resource value.
     */
    set locked(value: boolean);

    /**
     * Indicates whether the resource value is auto-generated (optional).
     */
    get auto(): boolean | undefined;

    /**
     * Sets the auto-generated state of the resource value.
     */
    set auto(value: boolean);

    /**
     * Gets the parent resource element of the value.
     */
    get parent(): Readonly<IResourceElement>;
}

/**
 * Represents paths information of a tree element.
 */
export interface ITreeElementPaths {
    /**
     * Retrieves the parent path of the tree element.
     * @param separator - The separator to use in the path.
     * @param includeRoot - Whether to include the root in the path (optional).
     * @returns The parent path of the tree element.
     */
    getParentPath(separator: string, includeRoot?: boolean): string;
}

/**
 * Represents the versions of the model and code generator.
 */
export type ModelVersionsType = {
    /**
     * Version of the model.
     */
    model: LhqModelVersion;

    /**
     * Version of the code generator.
     */
    codeGenerator: LhqCodeGenVersion;
};