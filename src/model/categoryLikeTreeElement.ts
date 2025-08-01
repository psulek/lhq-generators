import type { Mutable } from '../api';
import type { CategoryLikeTreeElementToJsonOptions, CategoryOrResourceType, ICategoryElement, ICategoryLikeTreeElement, IResourceElement, IRootModelElement, ITreeElement, ITreeElementPaths, TreeElementToJsonOptions, TreeElementType } from '../api/modelTypes';
import type { ILhqCategoryLikeModelType } from '../api/schemas';
import { arraySortBy, isNullOrEmpty, isNullOrUndefined, iterateObject, sortObjectByKey, strCompare } from '../utils';
import { ResourceElement } from './resourceElement';
import { TreeElement } from './treeElement';
import type { ICategoryLikeTreeElementOperations, MapToModelOptions } from './types';

export abstract class CategoryLikeTreeElement<TModel extends ILhqCategoryLikeModelType = ILhqCategoryLikeModelType> extends TreeElement<TModel> implements ICategoryLikeTreeElement, ICategoryLikeTreeElementOperations {
    protected _categories: CategoryLikeTreeElement[] | undefined;
    protected _resources: ResourceElement[] | undefined;
    protected _hasCategories = false;
    protected _hasResources = false;

    constructor(root: IRootModelElement, elementType: TreeElementType, name: string,
        parent: ICategoryLikeTreeElement | undefined) {
        super(root, elementType, name, parent);
    }

    protected abstract createCategory(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement | undefined): CategoryLikeTreeElement;

    protected nameChanged(): void {
        if (this.isRoot) { return; }

        arraySortBy(this.parent!.categories as Mutable<ICategoryElement[]>, x => x.name, 'asc', true);
    }

    protected internalToJson<TOptions extends CategoryLikeTreeElementToJsonOptions>(obj: Record<string, unknown>, options?: TOptions): void {
        const includeCategories = options?.includeCategories ?? true;
        const includeResources = options?.includeResources ?? true;

        obj.categories = (includeCategories ? this._categories?.map(x => x.toJson(options)) : undefined) ?? [];
        obj.resources = (includeResources ? this._resources?.map(x => x.toJson(options)) : undefined) ?? [];
        obj.hasCategories = this._hasCategories;
        obj.hasResources = this._hasResources;
    }

    protected bindToModel(model: Partial<TModel>, options?: MapToModelOptions): void {
        model.categories = (this._categories === undefined) || this._categories.length === 0
            ? undefined
            : Object.fromEntries(this._categories.map(x => [x.name, x.mapToModel(options)]));

        model.resources = (this._resources === undefined) || this._resources.length === 0
            ? undefined
            : Object.fromEntries(this._resources.map(x => [x.name, x.mapToModel(options)]));
    }

    public populate(source: TModel | undefined): void {
        if (source) {
            if (source.description !== undefined) {
                this._description = source.description;
            }

            const sourceCategories = source.categories;
            const sourceResources = source.resources;

            const newCategories: CategoryLikeTreeElement[] = [];
            const newResources: ResourceElement[] = [];

            if (!isNullOrEmpty(sourceCategories)) {
                iterateObject(sortObjectByKey(sourceCategories), (category, name) => {
                    const newCategory = this.createCategory(this.root, name, this);
                    newCategories.push(newCategory);
                    newCategory.populate(category);
                });
            }

            if (!isNullOrEmpty(sourceResources)) {
                iterateObject(sortObjectByKey(sourceResources), (resource, name) => {
                    const newResource = new ResourceElement(this.root, name, this);
                    newResources.push(newResource);
                    newResource.populate(resource);
                });
            }

            this._categories = newCategories;
            this._hasCategories = this.categories.length > 0;

            this._resources = newResources;
            this._hasResources = this.resources.length > 0;
        }
    }

    public get categories(): Readonly<ICategoryElement[]> {
        return this._categories ?? [];
    }

    public get resources(): Readonly<IResourceElement[]> {
        return this._resources ?? [];
    }

    public get hasCategories(): boolean {
        return this._hasCategories;
    }

    public get hasResources(): boolean {
        return this._hasResources;
    }

    public getCategory(name: string): ICategoryElement | undefined {
        return isNullOrEmpty(name) ? undefined : this.categories.find(x => strCompare(x.name, name, true));
    }

    public getResource(name: string): IResourceElement | undefined {
        return isNullOrEmpty(name) ? undefined : this.resources.find(x => strCompare(x.name, name, true));
    }

    public contains(name: string, elementType: CategoryOrResourceType): boolean {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        return this.find(name, elementType as any) !== undefined;
    }

    public find(name: string, elementType: 'category'): ICategoryElement | undefined;
    public find(name: string, elementType: 'resource'): IResourceElement | undefined;
    public find(name: string, elementType: CategoryOrResourceType): ITreeElement | undefined {
        if (isNullOrUndefined(name)) {
            throw new Error('Element name cannot be null or undefined.');
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (elementType === 'model') {
            throw new Error('Model element cannot be retrieved by name.');
        }

        return elementType === 'category' ? this.getCategory(name) : this.getResource(name);
    }

    public getElementByPath(elementPaths: ITreeElementPaths, elementType: 'category'): ICategoryElement | undefined;
    public getElementByPath(elementPaths: ITreeElementPaths, elementType: 'resource'): IResourceElement | undefined;
    public getElementByPath(elementPaths: ITreeElementPaths, elementType: CategoryOrResourceType): ITreeElement | undefined {
        if (isNullOrUndefined(elementPaths)) {
            throw new Error('Element paths cannot be null or undefined.');
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (elementType === 'model') {
            throw new Error('Model element cannot be retrieved by path.');
        }

        const paths = elementPaths.getPaths(true);
        if (paths.length === 0) {
            return undefined;
        }

        let currentElement: ITreeElement | undefined;
        let path = paths.shift();
        let isLast = paths.length === 0;

        while (!isNullOrEmpty(path)) {
            currentElement = currentElement ?? this;
            if (isLast) {
                currentElement = currentElement instanceof CategoryLikeTreeElement
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                    ? currentElement.find(path, elementType as any)
                    : undefined;
            } else {
                currentElement = currentElement instanceof CategoryLikeTreeElement
                    ? currentElement.getCategory(path)
                    : undefined;
            }

            path = paths.shift();
            isLast = paths.length === 0;
        }

        return currentElement?.elementType === elementType ? currentElement : undefined;
    }

    addElement(element: ITreeElement): void {
        if (element instanceof ResourceElement) {
            this._resources ??= [];
            if (!this._resources.includes(element) && !this._resources.some(x => strCompare(x.name, element.name, true))) {
                this.internalAddResource(element);
            }
        } else if (element instanceof CategoryLikeTreeElement) {
            this._categories ??= [];
            const categElement = element as CategoryLikeTreeElement<ILhqCategoryLikeModelType>;
            if (!this._categories.includes(categElement) && !this._categories.some(x => strCompare(x.name, categElement.name, true))) {
                this.internalAddCategory(categElement);
            }
        } else {
            throw new Error(`Could not add element of type ${element.elementType}.`);
        }
    }

    public addCategory(name: string): ICategoryElement {
        if (isNullOrUndefined(name)) {
            throw new Error('Category name cannot be null or undefined.');
        }

        const category = this.createCategory(this.root, name, this);
        this.internalAddCategory(category);
        return category;
    }

    private internalAddCategory(category: CategoryLikeTreeElement): void {
        this._categories ??= [];
        // Insert the category in sorted order by name
        const idx = this._categories.findIndex(x => x.name > category.name);
        if (idx === -1) {
            this._categories.push(category);
        } else {
            this._categories.splice(idx, 0, category);
        }
        this._hasCategories = true;
    }

    public removeCategory(name: string): void {
        if (this._categories && !isNullOrEmpty(name)) {
            const index = this._categories.findIndex(x => strCompare(x.name, name, true));
            if (index !== -1) {
                this._categories.splice(index, 1);
                this._hasCategories = this._categories.length > 0;
            }
        }
    }

    public removeChilds(categories: boolean, resources: boolean): void {
        if (categories && this._categories) {
            this._categories = [];
            this._hasCategories = false;
        }

        if (resources && this._resources) {
            this._resources = [];
            this._hasResources = false;
        }
    }

    public removeElement(element: ITreeElement): void {
        if (element instanceof ResourceElement && this._resources) {
            const idx = this._resources.findIndex(x => strCompare(x.name, element.name, true));
            if (idx !== -1) {
                this._resources.splice(idx, 1);
                this._hasResources = this._resources.length > 0;
            }
        } else if (element instanceof CategoryLikeTreeElement && this._categories) {
            const idx = this._categories.findIndex(x => strCompare(x.name, element.name, true));
            if (idx !== -1) {
                this._categories.splice(idx, 1);
                this._hasCategories = this._categories.length > 0;
            }
        } else {
            throw new Error(`Could not remove element of type ${element.elementType}.`);
        }
    }

    public addResource(name: string): IResourceElement {
        if (isNullOrUndefined(name)) {
            throw new Error('Resource name cannot be null or undefined.');
        }

        const resource = new ResourceElement(this.root, name, this);
        this.internalAddResource(resource);
        return resource;
    }

    private internalAddResource(resource: ResourceElement) {
        this._resources ??= [];

        // Insert the resource in sorted order by name
        const idx = this._resources.findIndex(x => x.name > resource.name);
        if (idx === -1) {
            this._resources.push(resource);
        } else {
            this._resources.splice(idx, 0, resource);
        }
        this._hasResources = true;
    }

    public removeResource(name: string): void {
        if (this._resources && !isNullOrEmpty(name)) {
            const index = this._resources.findIndex(x => strCompare(x.name, name, true));
            if (index !== -1) {
                this._resources.splice(index, 1);
                this._hasResources = this._resources.length > 0;
            }
        }
    }

    public childCount(elementType: CategoryOrResourceType): number {
        if (elementType === 'category') {
            return this._categories?.length ?? 0;
        } else if (elementType === 'resource') {
            return this._resources?.length ?? 0;
        } else {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Invalid element type: ${elementType}`);
        }
    }
}