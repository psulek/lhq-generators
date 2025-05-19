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

    /**
     * Changes the parent of the current tree element.
     * @param newParent - The new parent element, undefined if the element is root.
     * @returns True if the parent was changed successfully, otherwise false.
     * Checks will be performed to ensure the new parent does not already contain the element (category or resource) with the same name.
     * Also if current parent is the same as new parent, no changes will be made and true will be returned.
     */
    changeParent(newParent: ICategoryLikeTreeElement | undefined): boolean;
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
     * @param name - The name of the category to add.
     * @returns The created category element.
     */
    addCategory(name: string): ICategoryElement;

    /**
     * Removes a category from the categories list.
     * @param name - The name of the category to remove.
     */
    removeCategory(name: string): void;

    /**
     * Add new resource to resources list.
     * @param name - The name of the resource to add.
     */
    addResource(name: string): IResourceElement;

    /**
     * Removes a resource from the resources list.
     * @param name - The name of the resource to remove.
     */
    removeResource(name: string): void;

    /**
     * Removes a child element (category or resource) from the current element.
     * @param element - The child element to remove.
     * @remarks check is made by reference, not by name so current element has have reference to the element in either categories or resources list.
     * Error is not thrown if element is not found in either list.
     */
    removeElement(element: ITreeElement): void;

    /**
     * Retrieves a child element by full element paths, like `category1/category2/resource`.
     * @param elementPaths - The paths to the child element.
     * @param elementType - The type of the child element (category or resource).
     * @returns The child element if found, otherwise undefined.
     */
    getElementByPath(elementPaths: ITreeElementPaths, elementType: 'category'): ICategoryElement | undefined;
    getElementByPath(elementPaths: ITreeElementPaths, elementType: 'resource'): IResourceElement | undefined;
    getElementByPath(elementPaths: ITreeElementPaths, elementType: Exclude<TreeElementType, 'model'>): ITreeElement | undefined;

    /**
     * Retrieves a child element by name.
     * @param name - The name of the child element.
     * @returns The child element if found, otherwise undefined.
     */
    getCategory(name: string): ICategoryElement | undefined;

    /**
     * Retrieves a resource element by name.
     * @param name - The name of the resource element.
     * @returns The resource element if found, otherwise undefined.
     */
    getResource(name: string): IResourceElement | undefined;

    /**
     * Checks if the element (category or resource) exists by name and type.
     * @param name - The name of the element.
     * @param elementType - The type of the element.
     * @returns true if the element exists, otherwise false.
     */
    hasElement(name: string, elementType: Exclude<TreeElementType, 'model'>): boolean;
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
     * Gets the list of values for the resource element.
     */
    get values(): Readonly<IResourceValueElement[]>;

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
     * @param name - The name of the parameter to add.
     * @returns The created resource parameter element.
     */
    addParameter(name: string): IResourceParameterElement;

    /**
     * Removes a parameter from the resource element.
     * @param name - The name of the parameter to remove.
     */
    removeParameter(name: string): void;

    /**
     * Adds new resource value to the resource element.
     * @param languageName - The name of the language for the resource value.
     * @param value - The value of the resource.
     * @returns The created resource value element.
     */
    addValue(languageName: string, value: string): IResourceValueElement;

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
     * Retrieves the paths of the tree element.
     * @param includeRoot - Whether to include the root in the path (optional, default is false).
     * @returns The paths of the tree element.
     */
    getPaths(includeRoot?: boolean): string[];

    /**
     * Retrieves the parent path of the tree element.
     * @param separator - The separator to use in the path.
     * @param includeRoot - Whether to include the root in the path (optional, default is false).
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

export type ICodeGeneratorCsharpBase = {
    Namespace: string;
}