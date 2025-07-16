import type {
    LhqModelOptions,
    LhqModelResourceTranslationState, LhqModelUid, LhqModelVersion, LhqModelMetadata,
    LhqCodeGenVersion,
    LhqModelLineEndings,
    LhqModelDataNode
} from './schemas';
import type { TemplateMetadataSettings } from './templates';

export type TreeElementType = 'model' | 'category' | 'resource';

export type CategoryOrResourceType = Exclude<TreeElementType, 'model'>;

/**
 * Options for the conversion, such as whether to include data, etc.
 * 
 */
export type TreeElementToJsonOptions = {
    /**
     *  Whether to include the data in the JSON representation.
     */
    includeData?: boolean
};

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

    /**
     * Gets the level of the tree element in the hierarchy.
     * @returns The level of the tree element, where 0 is the root level.
     */
    getLevel(): number;

    /**
     * Converts the tree element to a plain JSON object.
     * @param options - Options for the conversion, such as whether to include data, etc.
     * @returns A plain JSON object representing the tree element.
     * @remarks
     * This method will skip properties `parent`, `root` as they reference to the parent and root element which can cause circular references.
     */
    toJson<TOptions extends TreeElementToJsonOptions>(options?: TOptions): Record<string, unknown>;

    /**
     * Updates the tree element from a plain JSON object that was created by `toJson` method.
     * @param json - A plain JSON object representing the tree element.
     * @remarks
     * This method does not update the `parent`, `root`, `elementType`, `paths` properties , only changable properties like `name`, `description`, `data` are updated.
     */
    //updateFromJson(json: Record<string, unknown>): void;
}

/**
 * Options for converting a category-like tree element to JSON.
 */
export type CategoryLikeTreeElementToJsonOptions = TreeElementToJsonOptions & {
    /**
     * Whether to include categories in the JSON representation.
     * Default is true.
     */
    includeCategories?: boolean;

    /**
     * Whether to include resources in the JSON representation.
     * Default is true.
     */
    includeResources?: boolean;
};

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
     * @remarks Search is case-insensitive.
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
     * @remarks Search is case-insensitive.
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
    getElementByPath(elementPaths: ITreeElementPaths, elementType: CategoryOrResourceType): ITreeElement | undefined;

    /**
     * Retrieves a child element by name.
     * @param name - The name of the child element.
     * @returns The child element if found, otherwise undefined.
     * @remarks Search is case-insensitive.
     */
    getCategory(name: string): ICategoryElement | undefined;

    /**
     * Retrieves a resource element by name.
     * @param name - The name of the resource element.
     * @returns The resource element if found, otherwise undefined.
     * @remarks Search is case-insensitive.
     */
    getResource(name: string): IResourceElement | undefined;

    /**
     * Checks if the element (category or resource) exists by name and type.
     * @param name - The name of the element.
     * @param elementType - The type of the element.
     * @returns true if the element exists, otherwise false.
     * @remarks Search is case-insensitive.
     */
    contains(name: string, elementType: CategoryOrResourceType): boolean;

    /**
     * Counts the number of child elements of a specific type.
     * @param elementType - The type of the child elements to count.
     * @returns The number of child elements of the specified type.
     */
    childCount(elementType: CategoryOrResourceType): number;

    /**
     * Finds a child element by name and type.
     * @param name - The name of the child element.
     * @param elementType - The type of the child element.
     * @returns true if the child element is found, otherwise false.
     * @remarks Search is case-insensitive.
     */
    find(name: string, elementType: 'category'): ICategoryElement | undefined;
    find(name: string, elementType: 'resource'): IResourceElement | undefined;
    find(name: string, elementType: CategoryOrResourceType): ITreeElement | undefined;

    /**
     * Removes all child elements (categories and/or resources) from the current element.
     * @param categories - Flag indicating whether to remove child categories.
     * @param resources - Flag indicating whether to remove child resources.
     */
    removeChilds(categories: boolean, resources: boolean): void;
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

// export interface CodeGeneratorResXSettings extends CodeGeneratorBasicSettings {
//     /**
//      * Resx file for primary language will also (like foreign language files) includes language code.
//      */
//     CultureCodeInFileNameForPrimaryLanguage: boolean;

//     /**
//      * Compatible text encoding, When enabled, text will be encoded using compatibility mode (System.Web.HttpUtility.HtmlEncode),
//      * otherwise only subset of characters (required for xml encoding) will be encoded.
//      */
//     CompatibleTextEncoding: boolean;
// }

// export interface CodeGeneratorCsharpSettingsBase extends CodeGeneratorBasicSettings {
//     /**
//      * Indicates whether to use expression body syntax for properties and methods.
//      */
//     UseExpressionBodySyntax: boolean;

//     /**
//      * C# Namespace for the generated code.
//      */
//     Namespace: string;
// }

// export interface CodeGeneratorCsharpSettings extends CodeGeneratorCsharpSettingsBase {
//     /**
//      * Indicates whether to fallback to primary language for missing translations.
//      */
//     MissingTranslationFallbackToPrimary: boolean;
// }

// export interface CodeGeneratorTypescriptSettings extends CodeGeneratorBasicSettings {
//     /**
//      * Ambient namespace name used in typescript definition.
//      */
//     AmbientNamespaceName: string;

//     /**
//      * Prefix for interface type used in typescript definition.
//      */
//     InterfacePrefix: string;
// }

// export interface CodeGeneratorTypescriptJsonSettings extends CodeGeneratorBasicSettings {
//     /**
//      * File name for primary language includes language code.
//      * Json file for primary language will also (like foreign language files) includes language code.
//      */
//     CultureCodeInFileNameForPrimaryLanguage: boolean;

//     /**
//      * Suffix for metadata file name.
//      */
//     MetadataFileNameSuffix: string;

//     /**
//      * Write key value pair even on empty translations.
//      */
//     WriteEmptyValues: boolean;
// }

export type CodeGeneratorGroupSettings = {
    /**
     * settingsGroup is a name of the group of settings, e.g. 'CSharp', 'ResX', 'Typescript', 'Json'.
     * value - is a dictionary of settings for the group, e.g. 'OutputFolder': '/path/to/output', 'EncodingWithBOM': true, ...
     */
    [settingsGroup: string]: Record<string, unknown>;
};

/**
 * Represents a code generator element.
 */
export type ICodeGeneratorElement = {
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
    // readonly settings: LhqModelDataNode;
    readonly settings: CodeGeneratorGroupSettings;
}

/**
 * Callback function type for iterating through the tree structure.
 * @param element - The current tree element being processed.
 * @param leaf - Indicates whether the current element is a leaf (i.e., has no children).
 * @returns void or false to stop the iteration.
 */
export type IterateTreeCallback = (element: ITreeElement, leaf: boolean) => void | false;


/**
 * Options for iterating through the tree structure.
 * @remarks
 * The options allow controlling which elements are included in the iteration callback.
 */
export type IterateTreeOptions = {
    /**
     * Indicates whether to include the root element in the iteration callback.
     * Root element will be still iterated, but callback will not be called for it when value is false.
     * Default is false.
     */
    root?: boolean;

    /**
     * Indicates whether to include categories in the iteration callback.
     * Categories will be still iterated, but callback will not be called for them when value is false.
     * Default is false.
     */
    categories?: boolean;

    /**
     * Indicates whether to include resources in the iteration callback.
     * Resources will be still iterated, but callback will not be called for them when value is false.
     * Default is false.
     */
    resources?: boolean;
};

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

    /**
     * Adds a new language to the root model element.
     * @param language - The language to add.
     */
    addLanguage(language: string): boolean;

    /**
     * Determines whether the root model element contains a specific language.
     * @param language - The language to check.
     */
    containsLanguage(language: string): boolean;

    /**
     * Removes a language from the root model element.
     * @param language - The language to remove.
     */
    removeLanguage(language: string): boolean;

    /**
     * Iterates through the tree structure starting from the root element and applies the callback function to each element.
     * @param callback - The callback function to apply to each tree element.
     * @param options - Options for the iteration, such as whether to include root, categories, and resources.
     * If `options` is not provided, it will iterate through all elements.
     * If `options` is provided, it will only iterate through elements specified in the options.
     * @throws Error if the root element is not an instance of RootModelElement.
     * @returns true if the iteration completes successfully, or false if the iteration was stopped by the callback function.
     */
    iterateTree(callback: IterateTreeCallback, options?: IterateTreeOptions): boolean;
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
     * Sets the value of the resource element for a specific language.
     * @param language - The language for which to set the value.
     * @param value - The value to set for the specified language.
     * @remarks
     * If the resource element already has a value for the specified language, it will be replaced.
     * If the resource element does not have a value for the specified language, a new value will be added.
     */
    setValue(language: string, value: string): void;

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
     * Adds multiple parameters to the resource element.
     * @param parameters - The list of parameters to add to the resource element.
     * @param options - Options for adding parameters, such as whether to skip existing parameters or update them.
     */
    addParameters(parameters: Array<Partial<IResourceParameterElement>>, options?: { existing: 'skip' | 'update' }): void;

    /**
     * Removes a parameter from the resource element.
     * @param name - The name of the parameter to remove.
     */
    removeParameter(name: string): void;

    /**
     * Removes all parameters from the resource element.
     */
    removeParameters(): void;

    /**
     * Adds new resource value to the resource element.
     * @param languageName - The name of the language for the resource value.
     * @param value - The value of the resource.
     * @param locked - Indicates whether the resource value is locked (optional, default - false).
     * @param auto - Indicates whether the resource value is auto-generated (optional, default - false).
     * @returns The created resource value element.
     */
    addValue(languageName: string, value: string, locked?: boolean, auto?: boolean): IResourceValueElement;

    /**
     * Adds multiple resource values to the resource element.
     * @param values - The list of resource values to add to the resource element.
     * @param options - Options for adding resource values, such as whether to skip existing values or update them.
     */
    addValues(values: Array<Partial<IResourceValueElement>>, options?: { existing: 'skip' | 'update' }): void;

    /**
     * Removes a resource value specified by `language` from the resource element.
     * @param language - The language of the resource value to remove.
     */
    removeValue(language: string): void;

    /**
     * Removes all resource values from the resource element.
     */
    removeValues(): void;
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

    /**
     * Converts the tree element to a plain JSON object.
     */
    toJson(): Record<string, unknown>;
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
    set value(value: string | undefined);

    /**
     * Indicates whether the resource value is locked (optional).
     */
    get locked(): boolean | undefined;

    /**
     * Sets the locked state of the resource value.
     */
    set locked(value: boolean | undefined);

    /**
     * Indicates whether the resource value is auto-generated (optional).
     */
    get auto(): boolean | undefined;

    /**
     * Sets the auto-generated state of the resource value.
     */
    set auto(value: boolean | undefined);

    /**
     * Gets the parent resource element of the value.
     */
    get parent(): Readonly<IResourceElement>;

    /**
     * Converts the tree element to a plain JSON object.
     */
    toJson(): Record<string, unknown>;
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

    /**
     * Converts the tree element to a plain JSON object.
     */
    toJson(): string[];
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

export type DataNodeToCodeGeneratorGroupSettingsDelegate = (node: LhqModelDataNode) => CodeGeneratorGroupSettings;

export interface ICodeGeneratorSettingsConvertor {
    nodeToSettings(templateId: string, node: LhqModelDataNode): CodeGeneratorGroupSettings;
    settingsToNode(templateId: string, settings: CodeGeneratorGroupSettings): LhqModelDataNode;

    convertValueForProperty(value: unknown, property: TemplateMetadataSettings): unknown;
}