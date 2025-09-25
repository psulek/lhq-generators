import type { ITreeElement } from '../api/modelTypes';

export interface ICategoryLikeTreeElementOperations {
    addElement(element: ITreeElement): void;
}

export type MapToModelOptions = {
    /**
     * If true, the data will be included in the model when calling `ModelUtils.elementToModel` or `ModelUtils.rootElementToModel`.
     * @defaultValue `false`
     */
    keepData?: boolean;

    /**
     * If `keepData` is true, this array will be used to filter the keys of the data object that will be included in the model.
     * If not provided, all keys will be included.
     */
    keepDataKeys?: string[];

    /**
     * Settins for resource values serialization.
     */
    //values?: LhqModelOptionsValues;
};

export type ElementToModelOptions = MapToModelOptions & { 
    /**
     * If true, default values for code generator settings will be applied and model version will be set to latest.
     */
    applyDefaults?: boolean 
};