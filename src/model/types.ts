import type { ITreeElement } from '../api/modelTypes';

export interface ICategoryLikeTreeElementOperations {
    addElement(element: ITreeElement): void;
}

export type MapToModelOptions = {
    keepData?: boolean;
    keepDataKeys?: string[];
};