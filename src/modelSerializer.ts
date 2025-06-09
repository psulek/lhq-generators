import type { IRootModelElement, ITreeElement, ITreeElementPaths } from './api/modelTypes';
import type { ILhqModelType, LhqModel } from './api/schemas';
import { validateLhqModel } from './generatorUtils';
import { RootModelElement } from './model/rootModelElement';
import { type TreeElement, TreeElementBase } from './model/treeElement';
import { TreeElementPaths } from './model/treeElementPaths';
import type { FormattingOptions } from './types';
import { serializeJson } from './utils';

export class ModelSerializer {
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

        return new RootModelElement(model);
    }

    /**
     * Sets temporary data for the specified tree element.
     * @param element - The tree element to set the temporary data for.
     * @param key - The key under which the value will be stored.
     * @param value - The value to be stored.
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static setTempData<T>(element: ITreeElement, key: string, value: T): void {
        if (ModelSerializer.isTreeElementInstance(element)) {
            element.addToTempData(key, value);
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelSerializer.createRootElement".');
        }
    }

    /**
     * Clears the temporary data of the specified tree element.
     * @param element - The tree element to clear the temporary data for.
     * @throws Error if the element is not an instance of TreeElementBase.
     */
    public static clearTempData(element: ITreeElement): void {
        if (ModelSerializer.isTreeElementInstance(element)) {
            element.clearTempData();
        } else {
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelSerializer.createRootElement".');
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
        const model = ModelSerializer.elementToModel(element);
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
            throw new Error('Invalid element. Expected an object that was created by calling fn "ModelSerializer.createRootElement".');
        }
    }
}