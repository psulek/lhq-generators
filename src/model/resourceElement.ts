import { arraySortBy, isNullOrEmpty, iterateObject, sortObjectByKey, sortObjectByValue, strCompare } from '../utils';
import { ResourceParameterElement } from './resourceParameterElement';
import { ResourceValueElement } from './resourceValueElement';
import { type LhqModelResource, type LhqModelResourceTranslationState } from '../api/schemas';
import type { IResourceElement, IResourceParameterElement, IResourceValueElement, IRootModelElement, ICategoryLikeTreeElement } from '../api/modelTypes';
import { TreeElement } from './treeElement';
import type { MapToModelOptions } from './types';
import type { Mutable } from '../api/types';

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

    protected nameChanged(): void {
        arraySortBy(this.parent!.resources as Mutable<IResourceElement[]>, x => x.name, 'asc', true);
    }

    protected internalToJson(obj: Record<string, unknown>, options?: { includeData?: boolean }): void {
        obj.state = this.state;
        if (this._parameters && this._parameters.length > 0) {
            obj.parameters = this._parameters
                .sort((a, b) => a.order - b.order)
                .map(param => param.toJson());
        } else {
            obj.parameters = [];
        }
        obj.values = this.values?.map(value => value.toJson()) ?? [];
        obj.hasParameters = this.hasParameters;
        obj.hasValues = this.hasValues;
        obj.comment = this.comment ?? '';
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

    protected bindToModel(model: Partial<LhqModelResource>, options?: MapToModelOptions): void {
        model.state = this._state;
        model.description = isNullOrEmpty(this._description) ? undefined : this._description;

        model.parameters = (this._parameters === undefined) || this._parameters.length === 0
            ? undefined
            : Object.fromEntries(this._parameters.map(param => [param.name, param.mapToModel()]));

        model.values = (this._values === undefined) || this._values.length === 0
            ? undefined
            : Object.fromEntries(this._values.map(value => [value.languageName, value.mapToModel()]));
    }

    public findParameter(name: string, ignoreCase?: boolean): IResourceParameterElement | undefined {
        if (isNullOrEmpty(name)) {
            throw new Error('Parameter name cannot be null or empty.');
        }

        if (this._parameters) {
            return this._parameters.find(param => strCompare(param.name, name, ignoreCase ?? true));
        }

        return undefined;
    }

    public addParameters(parameters: Array<Partial<IResourceParameterElement>>, options?: { existing: 'skip' | 'update' }): void {
        if (isNullOrEmpty(parameters)) {
            throw new Error('Parameters cannot be null or empty.');
        }

        if (!Array.isArray(parameters)) {
            throw new Error('Parameters must be an array.');
        }

        options = options ?? { existing: 'skip' };

        if (parameters.length === 0) {
            return;
        }

        this._parameters ??= [];
        let paramIdx = 0;
        parameters
            .sort((a, b) => (a.order ?? Number.MAX_VALUE) - (b.order ?? Number.MAX_VALUE))
            .forEach(param => {
                if (isNullOrEmpty(param.name)) {
                    throw new Error('Parameter name cannot be null or empty.');
                }

                const existing = this._parameters!.find(p => p.name === param.name);

                if (existing) {
                    if (options.existing === 'skip') {
                        return;
                    }

                    existing.description = param.description ?? existing.description;
                    existing.order = paramIdx++;
                    return;
                }

                const order = paramIdx++;
                const resourceParam = new ResourceParameterElement(param.name, { description: param.description, order }, this);
                this._parameters!.push(resourceParam);
            });

        this._hasParameters = true;
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

    public removeParameters(): void {
        if (this._parameters) {
            this._parameters = [];
            this._hasParameters = false;
        }
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

    // public setValue(language: string, value: string, options?: { checkLanguage?: boolean }): IResourceValueElement {
    public setValue(language: string, value: string): IResourceValueElement {
        if (isNullOrEmpty(language)) {
            throw new Error('Language name cannot be null or empty.');
        }

        if (this._values) {
            const item = this._values.find(x => x.languageName === language);
            if (item) {
                // const checkLanguage = options?.checkLanguage ?? true;
                // if (checkLanguage && !this.root.containsLanguage(language)) {
                //     throw new Error(`Language "${language}" does not exist in the model.`);
                // }

                item.value = value;
                return item;
            }
        }

        return this.addValue(language, value);
    }

    public addValue(language: string, value: string, locked?: boolean, auto?: boolean): IResourceValueElement {
        if (isNullOrEmpty(language)) {
            throw new Error('Language name cannot be null or empty.');
        }

        if (this._values && this._values.some(x => x.languageName === language)) {
            throw new Error(`Language "${language}" already exists in resource values.`);
        }

        // const checkLanguage = options?.checkLanguage ?? true;
        // if (checkLanguage && !this.root.containsLanguage(language)) {
        //     throw new Error(`Language "${language}" does not exist in the model.`);
        // }

        const resourceValue = new ResourceValueElement(language, { value, locked, auto }, this);
        this._values ??= [];
        this._values.push(resourceValue);
        this._hasValues = true;
        return resourceValue;
    }

    public addValues(values: Array<Partial<IResourceValueElement>>, options?: { existing: 'skip' | 'update' }): void {
        if (isNullOrEmpty(values)) {
            throw new Error('Values cannot be null or empty.');
        }

        if (!Array.isArray(values)) {
            throw new Error('Values must be an array.');
        }

        options = options ?? { existing: 'skip' };

        if (values.length === 0) {
            return;
        }

        // const checkLanguage = options.checkLanguage ?? true;

        this._values ??= [];
        values.forEach(value => {
            if (isNullOrEmpty(value.languageName)) {
                throw new Error('Language name cannot be null or empty.');
            }

            // if (checkLanguage && !this.root.containsLanguage(value.languageName)) {
            //     throw new Error(`Language "${value.languageName}" does not exist in the model.`);
            // }

            const existing = this._values!.find(v => v.languageName === value.languageName);

            if (existing) {
                if (options.existing === 'skip') {
                    return;
                }

                existing.value = value.value ?? existing.value;
                existing.locked = value.locked ?? existing.locked;
                existing.auto = (value.auto ?? existing.auto) ?? false;
                return;
            }

            const resourceValue = new ResourceValueElement(value.languageName,
                { value: value.value, locked: value.locked, auto: value.auto }, this);
            this._values!.push(resourceValue);
        });

        this._hasValues = true;
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

    public removeValues(): void {
        if (this._values) {
            this._values = [];
            this._hasValues = false;
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

    public findValue = (language: string): IResourceValueElement | undefined => {
        if (!isNullOrEmpty(language) && this.values) {
            return this.values.find(x => x.languageName === language);
        }

        return undefined;
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