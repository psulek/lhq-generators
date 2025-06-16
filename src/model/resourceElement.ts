import { isNullOrEmpty, iterateObject, sortObjectByKey, sortObjectByValue } from '../utils';
import { ResourceParameterElement } from './resourceParameterElement';
import { ResourceValueElement } from './resourceValueElement';
import { type LhqModelResource, type LhqModelResourceTranslationState } from '../api/schemas';
import type { IResourceElement, IResourceParameterElement, IResourceValueElement, IRootModelElement, ICategoryLikeTreeElement } from '../api/modelTypes';
import { TreeElement } from './treeElement';

export class ResourceElement extends TreeElement<LhqModelResource> implements IResourceElement {
    private _state: LhqModelResourceTranslationState = 'New';
    private _parameters: ResourceParameterElement[] | undefined;
    private _values: ResourceValueElement[] | undefined;
    private _comment = '';
    private _hasParameters = false;
    private _hasValues = false;

    constructor(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement) {
        super(root, 'resource', name, parent);
    }

    public populate(source: LhqModelResource | undefined): void {
        if (source) {
            this._state = source.state;
            this._description = source.description;

            if (!isNullOrEmpty(source.parameters)) {
                iterateObject(sortObjectByValue(source.parameters, x => x.order), (parameter, name) => {
                    this._parameters ??= [];
                    this._parameters.push(new ResourceParameterElement(name, parameter, this));
                });
            }

            if (!isNullOrEmpty(source.values)) {
                iterateObject(sortObjectByKey(source.values), (resValue, name) => {
                    this._values ??= [];
                    this._values.push(new ResourceValueElement(name, resValue, this));
                });
            }
        } else {
            this._state = 'New'
        }

        this._hasParameters = this.parameters.length > 0;
        this._hasValues = this.values.length > 0;
        this._comment = this.getComment();
    }

    public mapToModel(): LhqModelResource {
        return {
            state: this._state,
            description: this._description,
            parameters: (this._parameters === undefined) || this._parameters.length === 0
                ? undefined
                : Object.fromEntries(this._parameters.map(param => [param.name, param.mapToModel()])),

            values: (this._values === undefined) || this._values.length === 0
                ? undefined
                : Object.fromEntries(this._values.map(value => [value.languageName, value.mapToModel()]))
        };
    }

    public addParameter(name: string): IResourceParameterElement {
        if (isNullOrEmpty(name)) {
            throw new Error('Parameter name cannot be null or empty.');
        }

        let maxOrder = 0;

        if (this._parameters && this._parameters.length > 0) {
            if (this._parameters.some(param => param.name === name)) {
                throw new Error(`Parameter name "${name}" already exists.`);
            }

            maxOrder = this._parameters.reduce((max, param) => Math.max(max, param.order), 0) + 1;
        }

        const parameter = new ResourceParameterElement(name, { order: maxOrder }, this);
        this._parameters ??= [];
        this._parameters.push(parameter);
        this._hasParameters = true;
        return parameter;
    }

    public removeParameter(name: string): void {
        if (this._parameters && !isNullOrEmpty(name)) {
            const index = this._parameters.findIndex(parameter => parameter.name === name);
            if (index !== -1) {
                this._parameters.splice(index, 1);
                this._hasParameters = this._parameters.length > 0;
            }
        }
    }

    public setValue(language: string, value: string): void {
        if (isNullOrEmpty(language)) {
            throw new Error('Language name cannot be null or empty.');
        }

        if (this._values) {
            const item = this._values.find(x => x.languageName === language);
            if (item) {
                item.value = value;
                return;
            }
        }

        this.addValue(language, value);
    }

    public addValue(languageName: string, value: string): IResourceValueElement {
        if (isNullOrEmpty(languageName)) {
            throw new Error('Language name cannot be null or empty.');
        }

        if (this._values && this._values.some(x => x.languageName === languageName)) {
            throw new Error(`Language name "${languageName}" already exists.`);
        }

        const resourceValue = new ResourceValueElement(languageName, undefined, this);
        resourceValue.value = value;
        this._values ??= [];
        this._values.push(resourceValue);
        this._hasValues = true;
        return resourceValue;
    }

    public removeValue(language: string): void {
        if (this._values && !isNullOrEmpty(language)) {
            const index = this._values.findIndex(value => value.languageName === language);
            if (index !== -1) {
                this._values.splice(index, 1);
                this._hasValues = this._values.length > 0;
            }
        }
    }

    private getComment = (): string => {
        const primaryLanguage = this.root.primaryLanguage ?? '';
        if (!isNullOrEmpty(primaryLanguage) && this.values) {
            const value = this.values.find(x => x.languageName === primaryLanguage);
            const resourceValue = value?.value;
            const propertyComment = (isNullOrEmpty(resourceValue) ? this.description : resourceValue) ?? '';
            return this.trimComment(propertyComment);
        }

        return '';
    }

    private trimComment(value: string): string {
        if (isNullOrEmpty(value)) {
            return '';
        }

        let trimmed = false;
        let idxNewLine = value.indexOf('\r\n');

        if (idxNewLine == -1) {
            idxNewLine = value.indexOf('\n');
        }

        if (idxNewLine == -1) {
            idxNewLine = value.indexOf('\r');
        }

        if (idxNewLine > -1) {
            value = value.substring(0, idxNewLine);
            trimmed = true;
        }

        if (value.length > 80) {
            value = value.substring(0, 80);
            trimmed = true;
        }

        if (trimmed) {
            value += '...';
        }

        return value.replace(/\t/g, ' ');
    }

    public getValue = (language: string, trim?: boolean): string => {
        let result = '';
        if (!isNullOrEmpty(language) && this.values) {
            const value = this.values.find(x => x.languageName === language);
            result = value?.value ?? '';
        }

        return trim === true ? result.trim() : result;
    }

    public hasValue = (language: string): boolean => {
        if (!isNullOrEmpty(language) && this.values) {
            const value = this.values.find(x => x.languageName === language);
            return !isNullOrEmpty(value);
        }

        return false;
    }

    public get hasParameters(): boolean {
        return this._hasParameters;
    }

    public get hasValues(): boolean {
        return this._hasValues;
    }

    public get comment(): string {
        return this._comment;
    }

    public set comment(value: string) {
        this._comment = value;
    }

    public get state(): LhqModelResourceTranslationState {
        return this._state;
    }

    public set state(state: LhqModelResourceTranslationState) {
        this._state = state;
    }

    public get parameters(): Readonly<IResourceParameterElement[]> {
        return this._parameters ?? [];
    }

    public get values(): Readonly<IResourceValueElement[]> {
        return this._values ?? [];
    }
}