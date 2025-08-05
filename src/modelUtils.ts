import type { CodeGeneratorGroupSettings, ICategoryLikeTreeElement, ICodeGeneratorElement, ICodeGeneratorSettingsConvertor, IResourceElement, IResourceValueElement, IRootModelElement, ITreeElement, ITreeElementPaths } from './api/modelTypes';
import type { ILhqModelType, LhqModel, LhqModelCategory, LhqModelResource } from './api/schemas';
import type { TemplateMetadataSettings } from './api/templates';
import { validateLhqModel } from './generatorUtils';
import { HbsTemplateManager } from './hbsManager';
import { CategoryElement } from './model/categoryElement';
import type { CategoryLikeTreeElement } from './model/categoryLikeTreeElement';
import { ModelVersions } from './model/modelConst';
import { ResourceElement } from './model/resourceElement';
import { RootModelElement } from './model/rootModelElement';
import { type TreeElement, TreeElementBase } from './model/treeElement';
import { TreeElementPaths } from './model/treeElementPaths';
import type { MapToModelOptions } from './model/types';
import { CodeGeneratorSettingsConvertor } from './settingsConvertor';
import type { FormattingOptions, ImportModelErrorKind, ImportModelMode, ImportModelOptions, ImportModelResult, ImportResourceItem } from './types';
import { arraySortBy, isNullOrEmpty, serializeJson, strCompare } from './utils';
import type { Mutable } from './api';

export class ModelUtils {
    private static codeGeneratorSettingsConvertor = new CodeGeneratorSettingsConvertor();

    /**
     * Returns an instance of `ICodeGeneratorSettingsConvertor` for converting code generator settings.
     */
    public static getCodeGeneratorSettingsConvertor(): ICodeGeneratorSettingsConvertor {
        return ModelUtils.codeGeneratorSettingsConvertor;
    }

    /**
     * Creates a new root element for the specified LHQ model data.
     * @param data - The LHQ model data to be used for creating the root element.
     * @returns  The created root element.
     */
    public static createRootElement(data?: LhqModel | string): IRootModelElement {
        let model: LhqModel | undefined;
        if (data) {
            const validation = validateLhqModel(data);
            model = validation.success ? validation.model : undefined;
        }

        return new RootModelElement(model, ModelUtils.codeGeneratorSettingsConvertor);
    }

    /**
     * Creates a new code generator element for the specified template ID and settings.
     * @param templateId - The ID of the template to be used for the code generator element.
     * @param settings - The settings to be applied to the code generator element.
     */
    public static createCodeGeneratorElement(templateId: string, settings?: CodeGeneratorGroupSettings): ICodeGeneratorElement {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template Id cannot be empty !');
        }

        const definition = HbsTemplateManager.getTemplateDefinition(templateId);
        if (!definition) {
            throw new Error(`Template definition for '${templateId}' not found.`);
        }

        settings = settings || {};

        function validateValue(group: string, name: string, value: unknown, definitionSettings: TemplateMetadataSettings[]): unknown {
            const setting = definitionSettings.find(x => x.name === name);
            if (!setting) {
                throw new Error(`Setting '${name}' (group: '${group}') not found in template definition for '${templateId}'.`);
            }

            if (setting.type === 'boolean' && typeof value !== 'boolean') {
                throw new Error(`Setting '${name}' (group: '${group}') must be a boolean value in template definition for '${templateId}'.`);
            }

            if (setting.type === 'string' && typeof value !== 'string') {
                throw new Error(`Setting '${name}' (group: '${group}') must be a string value in template definition for '${templateId}'.`);
            }

            if (setting.type === 'list') {
                const settingValues = setting.values || [];

                if (!settingValues.some(x => x.value === value) || typeof value !== 'string') {
                    const listVals = settingValues.map(x => x.value || x.name).join(', ');
                    throw new Error(`Setting '${name}' (group: '${group}') must be an value from list (${listVals}) in template definition for '${templateId}'.`);
                }
            }

            return value === undefined ? setting.default : value;
        }

        // group -> eg: 'Typescript', 'CSharp', 'Json', etc.
        for (const group of Object.keys(definition.settings)) {
            if (!Object.prototype.hasOwnProperty.call(settings, group)) {
                settings[group] = {};
            }

            const groupSettings = definition.settings[group];
            for (const definitionSetting of groupSettings) {
                if (!Object.prototype.hasOwnProperty.call(settings[group], definitionSetting.name)) {
                    if (definitionSetting.default !== null) {
                        settings[group][definitionSetting.name] = definitionSetting.default;
                    }
                } else {
                    const settingValue = validateValue(group, definitionSetting.name,
                        settings[group][definitionSetting.name], groupSettings);

                    settings[group][definitionSetting.name] = settingValue;
                }
            }
        }

        return {
            templateId,
            version: ModelVersions.codeGenerator,
            settings
        };
    }

    // /**
    //  * Iterates through the tree structure starting from the root element and applies the callback function to each element.
    //  * @param root - The root element of the tree to iterate through.
    //  * @param callback - The callback function to apply to each tree element.
    //  * @throws Error if the root element is not an instance of RootModelElement.
    //  */
    // public static iterateTree(root: IRootModelElement, callback: (element: ITreeElement, leaf: boolean) => void | boolean): void | false {
    //     if (!(root instanceof RootModelElement)) {
    //         throw new Error('Invalid root element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
    //     }

    //     const iterate = (element: ITreeElement, leaf: boolean): void | false => {
    //         const result = callback(element, leaf);
    //         if (result === false) {
    //             return false;
    //         }
    //         if (element instanceof CategoryLikeTreeElement) {
    //             const lastCategory = element.categories.length === 0 ? undefined : element.categories[element.categories.length - 1];
    //             for (const category of element.categories) {
    //                 if (iterate(category, category === lastCategory) === false) {
    //                     return false;
    //                 }
    //             }

    //             const lastResource = element.resources.length === 0 ? undefined : element.resources[element.resources.length - 1];
    //             for (const resource of element.resources) {
    //                 if (iterate(resource, resource === lastResource) === false) {
    //                     return false;
    //                 }
    //             }
    //         }
    //     }

    //     return iterate(root, true);
    // }

    /**
     * Sets temporary data for the specified tree element.
     * @param element - The tree element to set the temporary data for.
     * @param key - The key under which the value will be stored.
     * @param value - The value to be stored.
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static setTempData<T>(element: ITreeElement, key: string, value: T): void {
        if (ModelUtils.isTreeElementInstance(element)) {
            element.addToTempData(key, value);
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
        }
    }

    /**
     * Clears the temporary data of the specified tree element.
     * @param element - The tree element to clear the temporary data for.
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static clearTempData(element: ITreeElement): void {
        if (ModelUtils.isTreeElementInstance(element)) {
            element.clearTempData();
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
        }
    }

    /**
     * Checks if the specified element is a tree element instance.
     * @param element - The element to check.
     * @returns `true` if the element is a tree element instance, otherwise `false`.
     */
    public static isTreeElementInstance(element: ITreeElement): element is TreeElementBase {
        return element instanceof TreeElementBase;
    }

    /*
    * Creates a new tree element paths object for the specified path and separator.
    * @param path - The path to be parsed.
    * @param separator - The separator used to split the path, optional, defaults to `/`.
    * @returns The created tree element paths object.
    */
    public static createTreePaths(path: string, separator: string = '/'): ITreeElementPaths {
        return TreeElementPaths.parse(path, separator);
    }

    /**
     * Converts the specified root element to an LHQ model (plain JSON object).
     * @param root - The root element to convert.
     * @returns The converted LHQ model.
     * @throws Error if the root element is not an instance of RootModelElement.
     */
    public static rootElementToModel(root: IRootModelElement): LhqModel {
        if (!(root instanceof RootModelElement)) {
            throw new Error('Invalid root element. Expected an object that was created by calling fn "createRootElement".');
        }

        const str = JSON.stringify(root.mapToModel());
        return JSON.parse(str) as LhqModel;
    }

    /**
     * Serializes the LHQ model to a string with the specified line endings.
     * @param model - The LHQ model to serialize.
     * @param options - The formatting options to use.
     * @returns The serialized LHQ model as a string.
     */
    public static serializeModel(model: LhqModel, options: FormattingOptions): string {
        return serializeJson(model, options);
    }

    /**
     * Serializes the specified tree element to a string with the specified line endings.
     * @param element - The tree element to serialize.
     * @param options - The formatting options to use.
     * @returns The serialized tree element as a string.
     */
    public static serializeTreeElement(element: ITreeElement, options: FormattingOptions): string {
        const model = ModelUtils.elementToModel(element);
        return serializeJson(model, options);
    }

    /**
     * Converts the specified tree element to its corresponding model type (ILhqModelType)
     * @param element - The tree element to convert.
     * @returns The converted model (ILhqModelType).
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static elementToModel<TModel extends ILhqModelType>(element: ITreeElement, options?: MapToModelOptions): TModel {
        if (element instanceof TreeElementBase) {
            return (element as TreeElement<TModel>).mapToModel(options);
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
        }
    }

    public static cloneElement(element: ITreeElement, newName?: string): ITreeElement {
        if (!ModelUtils.isTreeElementInstance(element)) {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
        }

        const isRoot = element instanceof RootModelElement || element.isRoot;

        if (!element.parent && !isRoot) {
            throw new Error('Cannot clone element without a parent. Please ensure the element is part of a tree structure.');
        }

        newName = (newName ?? element.name) ?? '';

        if (!isRoot) {
            const parentElements = element.elementType === 'category' ? element.parent!.categories : element.parent!.resources;

            const newName2 = newName.toLowerCase();
            let existingElems = parentElements.filter(x => x.name.toLowerCase() === newName2);
            if (existingElems.length === 0) {
                existingElems = parentElements.filter(x => x.name.toLowerCase().startsWith(newName2));
            }

            if (existingElems.length > 0) {
                let i = 1;
                while (existingElems.some(x => x.name.toLowerCase() === `${newName2}${i}`)) {
                    i++;
                }
                newName = `${newName}${i}`;
            }
        }

        const model = ModelUtils.elementToModel(element);
        let newElement: ITreeElement;

        if (isRoot) {
            // If the element is a root element, we need to create a new root element
            newElement = ModelUtils.createRootElement(model as LhqModel);
            newElement.name = newName!;
        } else {
            if (element.elementType === 'category') {
                newElement = new CategoryElement(element.root, newName, element.parent);
                (newElement as CategoryElement).populate(model as LhqModelCategory);
            } else if (element.elementType === 'resource') {
                newElement = new ResourceElement(element.root, newName, element.parent!);
                (newElement as ResourceElement).populate(model as LhqModelResource);
            } else {
                throw new Error(`Unsupported element type: ${element.elementType}`);
            }

            (element.parent as CategoryLikeTreeElement).addElement(newElement);
        }

        return newElement;
    }

    public static importModel(model: IRootModelElement, mode: ImportModelMode, options: ImportModelOptions): ImportModelResult {
        if (!(model instanceof RootModelElement)) {
            throw new Error('Invalid model. Expected objects created by calling fn "ModelUtils.createRootElement".');
        }

        if (options.sourceKind === 'model' && (!(options.source instanceof RootModelElement))) {
            throw new Error('Invalid model to import. Expected an object created by calling fn "ModelUtils.createRootElement".');
        }

        if (options.sourceKind === 'rows' && (isNullOrEmpty(options.source) || !Array.isArray(options.source))) {
            throw new Error('Invalid model to import (rows). Expected an array of rows.');
        }

        if (!options) {
            throw new Error('Import options must be provided.');
        }

        const importNewLanguages = options.importNewLanguages ?? true;
        const importNewElements = options.importNewElements ?? true;
        const importAsNew = mode === 'importAsNew';
        const cloneSource = options.cloneSource ?? true;

        if (mode !== 'merge' && mode !== 'importAsNew') {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Invalid mode: ${mode}. Expected 'merge' or 'importAsNew'.`);
        }

        const result: ImportModelResult = {
            error: undefined,
            errorKind: undefined,
            newCategories: 0,
            updateCategories: 0,
            newResources: 0,
            updateResources: 0,
            newLanguages: 0,
            resultModel: model
        };

        const returnError = (kind: ImportModelErrorKind, message: string): ImportModelResult => {
            result.error = message;
            result.errorKind = kind;
            return result;
        };

        const modelToImport = options.sourceKind === 'rows'
            ? ModelUtils.rowsToModel(options.source)
            : options.source;

        if (!modelToImport.hasLanguages || (!modelToImport.hasCategories && !modelToImport.hasResources)) {
            return returnError('emptyModel', 'The model to import does not contain any languages, categories, or resources.');
        }

        const isTreeStructure = model.options.categories === true;

        if (modelToImport.hasCategories && !isTreeStructure) {
            return returnError('categoriesForFlatStructure', 'The model to import contains categories, but the current model does not support tree structure (categories).');
        }

        const backupRootCategoriesNames = model.categories.map(x => x.name);
        let backupModel: ILhqModelType | undefined;

        if (cloneSource) {
            model = ModelUtils.cloneElement(model) as IRootModelElement;
            result.resultModel = model;
        } else {
            backupModel = ModelUtils.elementToModel(model);
        }

        try {
            // add missing languages
            if (importNewLanguages && modelToImport.languages.length > 0) {
                modelToImport.languages.forEach(otherLang => {
                    if (!model.containsLanguage(otherLang)) {
                        model.addLanguage(otherLang);
                        result.newLanguages++;
                    }
                });
            }

            const modelLanguages = new Set<string>(model.languages);

            let targetCategoryForImport: ICategoryLikeTreeElement;
            if (importAsNew) {
                const newCateg = model.addCategory(`Imported_${Date.now()}`);
                let idx = 0;
                // unique name
                while (backupRootCategoriesNames.some(x => strCompare(x, newCateg.name))) {
                    newCateg.name += '_' + (++idx);
                }

                targetCategoryForImport = newCateg;
                result.newCategories++;
                result.newCategoryPaths = targetCategoryForImport.paths.clone(true);
            } else {
                targetCategoryForImport = model;
            }

            let primaryLanguage = model.primaryLanguage;
            recursiveImport(modelToImport, targetCategoryForImport);

            primaryLanguage = model.primaryLanguage;

            if (isNullOrEmpty(primaryLanguage)) {
                const enLanguage = model.languages.find(x => strCompare(x, 'en'));
                primaryLanguage = enLanguage ?? model.languages[0];
                model.primaryLanguage = primaryLanguage;
            }

            function importResources(resources: IResourceElement[], target: ICategoryLikeTreeElement): void {
                resources.forEach(sourceResource => {
                    let targetResource = target.find(sourceResource.name, 'resource');
                    let updatedResource = false;

                    if (targetResource) {
                        if (sourceResource.description !== targetResource.description) {
                            targetResource.description = sourceResource.description;
                            result.updateResources++;
                            updatedResource = true;
                        }
                    } else {
                        if (importNewElements) {
                            targetResource = target.addResource(sourceResource.name);
                            targetResource.description = sourceResource.description;
                            result.newResources++;
                            updatedResource = true;
                        } else {
                            return;
                        }
                    }

                    sourceResource.values.forEach(sourceResourceValue => {
                        const languageName = sourceResourceValue.languageName;
                        const targetModelHasLanguage = modelLanguages.has(languageName);

                        let targetResourceValue = (targetModelHasLanguage || importNewLanguages) // if target model has language or importing new is allowed...
                            ? targetResource.findValue(languageName)
                            : undefined;

                        // target model does not have the language, but importing new languages is allowed
                        if (!targetModelHasLanguage && importNewLanguages) {
                            modelLanguages.add(languageName);
                        }

                        if (!targetResourceValue) {
                            if (modelLanguages.has(languageName)) {
                                targetResourceValue = targetResource.setValue(languageName, sourceResourceValue.value ?? '');
                                targetResourceValue.assign(sourceResourceValue);
                                if (!updatedResource) {
                                    result.updateResources++;
                                    updatedResource = true;
                                }
                            }
                        } else {
                            const changed = targetResourceValue.assign(sourceResourceValue);
                            if (changed && !updatedResource) {
                                result.updateResources++;
                                updatedResource = true;
                            }
                        }
                    });

                    sourceResource.parameters.forEach(sourceParam => {
                        let targetParameter = targetResource.parameters.find(x => strCompare(x.name, sourceParam.name));

                        if (!targetParameter) {
                            targetParameter = targetResource.addParameter(sourceParam.name);
                            const changed = targetParameter.assign(sourceParam);
                            if (!updatedResource && changed) {
                                result.updateResources++;
                                updatedResource = true;
                            }
                        } else {
                            const changed = targetParameter.assign(sourceParam);
                            if (!updatedResource && changed) {
                                result.updateResources++;
                                updatedResource = true;
                            }
                        }
                    });
                });
            }

            function recursiveImport(source: ICategoryLikeTreeElement, target: ICategoryLikeTreeElement): void {
                source.categories.forEach(sourceCategory => {
                    let targetCategory = target.find(sourceCategory.name, 'category');

                    let categoryAdded = false;
                    if (!targetCategory) {
                        targetCategory = target.addCategory(sourceCategory.name);
                        categoryAdded = true;
                        result.newCategories++;
                    }

                    if (targetCategory) {
                        if (targetCategory.description !== sourceCategory.description) {
                            targetCategory.description = sourceCategory.description;
                            if (!categoryAdded) {
                                result.updateCategories++;
                            }
                        }

                        // if source category has some child categories or child resources, do recursive import on that source category
                        if (sourceCategory.categories.length > 0 || sourceCategory.resources.length > 0) {
                            recursiveImport(sourceCategory, targetCategory);
                        }
                    }
                });

                // iterate source resources
                importResources(source.resources as Mutable<IResourceElement[]>, target);
            }

            modelLanguages.forEach(language => {
                if (!model.containsLanguage(language)) {
                    model.addLanguage(language);
                    result.newLanguages++;
                }
            });

            if (result.newResources === 0 && result.updateResources === 0) {
                return returnError('noResourcesToImport', 'The model to import does not contain any resources.');
            }

        } finally {
            // if there was error during import, restore the model from backup (if was not cloned)
            if (!isNullOrEmpty(result.errorKind) && backupModel) {
                (model as RootModelElement).populate(backupModel as LhqModel);
            }
        }
        return result;
    }

    private static rowsToModel(lineItems: ImportResourceItem[]): IRootModelElement {
        const rootModel = ModelUtils.createRootElement();

        const getModelPaths = (paths: ITreeElementPaths): string[] => paths.getPaths(true);
        const getPath = (item: ImportResourceItem, countOfParts: number): string => {
            const paths = item.paths.getPaths(true);
            if (paths.length >= countOfParts) {
                return paths.slice(0, countOfParts).join('/');
            }
            return '';
        }

        arraySortBy(lineItems, x => getModelPaths(x.paths).length, 'desc', true);
        const categoryCache = new Map<string, ICategoryLikeTreeElement>();

        const languages = new Set<string>();

        lineItems.forEach(lineItem => {
            const modelPath = lineItem.paths;
            const elementKey = lineItem.paths.getParentPath('/', true);
            const partsCount = getModelPaths(modelPath).length;
            const isResource = partsCount <= 1;

            let categoryForNewResource: ICategoryLikeTreeElement = rootModel;
            let newResourceName: string;

            if (isResource) {
                newResourceName = elementKey; //lineItem.elementKey;
            } else {
                const categoryPath = getPath(lineItem, partsCount - 1);
                let category = categoryCache.has(categoryPath)
                    ? categoryCache.get(categoryPath)
                    : ModelUtils.findCategoryByPaths(rootModel, modelPath, partsCount - 1);

                if (isNullOrEmpty(category)) {
                    let parentCategory: ICategoryLikeTreeElement = rootModel;
                    getModelPaths(modelPath).slice(0, partsCount - 1).forEach(categoryName => {
                        parentCategory = parentCategory.find(categoryName, 'category') ?? parentCategory.addCategory(categoryName);
                    });

                    if (parentCategory !== rootModel) {
                        category = parentCategory;
                        categoryCache.set(categoryPath, category);
                    }
                }

                categoryForNewResource = category ?? rootModel;
                newResourceName = getModelPaths(modelPath)[partsCount - 1];
            }

            if (!categoryForNewResource.find(newResourceName, 'resource')) {
                const newResource = categoryForNewResource.addResource(newResourceName);
                const values = lineItem.values.map<Partial<IResourceValueElement>>(x => ({ languageName: x.language, value: x.value }));
                lineItem.values.forEach(value => {
                    languages.add(value.language);
                });

                newResource.addValues(values, { existing: 'update' });
            }
        });

        languages.forEach(language => {
            if (!rootModel.containsLanguage(language)) {
                rootModel.addLanguage(language);
            }
        });

        return rootModel;
    }

    private static findCategoryByPaths(rootModel: IRootModelElement,
        elementPaths: ITreeElementPaths, deep: number): ICategoryLikeTreeElement | undefined {

        if (!rootModel || !elementPaths) {
            return undefined;
        }

        const paths = elementPaths.getPaths(true);
        if (paths.length === 0 || paths.length < deep) {
            return undefined;
        }

        let result: ICategoryLikeTreeElement | undefined;
        const pathParts = paths.slice(0, deep);
        if (pathParts.length > 1) {
            let parentCategory: ICategoryLikeTreeElement | undefined = undefined;
            for (const findByName of pathParts) {
                parentCategory = (parentCategory ?? rootModel).find(findByName, 'category');
                if (!parentCategory) {
                    break;
                }
            }

            result = parentCategory;
        } else {
            result = rootModel.find(pathParts[0], 'category');
        }

        return result;
    }
}