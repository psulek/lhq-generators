import type { CodeGeneratorGroupSettings, ICodeGeneratorElement, IRootModelElement, ITreeElement, ITreeElementPaths } from './api/modelTypes';
import type { ILhqModelType, LhqModel, LhqModelDataNode } from './api/schemas';
import type { TemplateMetadataSettings } from './api/templates';
import { validateLhqModel } from './generatorUtils';
import { HbsTemplateManager } from './hbsManager';
import { ModelVersions } from './model/modelConst';
import { RootModelElement } from './model/rootModelElement';
import { type TreeElement, TreeElementBase } from './model/treeElement';
import { TreeElementPaths } from './model/treeElementPaths';
import { codeGeneratorSettingsConvertor } from './settingsConvertor';
import type { FormattingOptions } from './types';
import { isNullOrEmpty, serializeJson } from './utils';




export class ModelUtils {
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

        return new RootModelElement(model, codeGeneratorSettingsConvertor);
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

            if (setting.type === 'list' && !Array.isArray(value)) {
                const listVals = (setting.values?.map(x => x.value || x.name) || []).join(', ');
                throw new Error(`Setting '${name}' (group: '${group}') must be an value from list (${listVals}) in template definition for '${templateId}'.`);
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
        // if (model instanceof RootModelElement && model.metadatas) {
        //     const metadatas = model.metadatas;
        //     model.metadatas = undefined;
        //     const metadatasJson = serializeJson(metadatas, options);
        // }

        return serializeJson(model, options);
    }

    /**
     * Converts the specified tree element to its corresponding model type (ILhqModelType)
     * @param element - The tree element to convert.
     * @returns The converted model (ILhqModelType).
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static elementToModel<TModel extends ILhqModelType>(element: ITreeElement): TModel {
        if (element instanceof TreeElementBase) {
            return (element as TreeElement<TModel>).mapToModel();
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelUtils.createRootElement".');
        }
    }
}