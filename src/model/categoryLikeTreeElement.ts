import type { ICategoryElement, ICategoryLikeTreeElement, IResourceElement, IRootModelElement, TreeElementType } from '../api/modelTypes';
import type { ILhqCategoryLikeModelType } from '../api/schemas';
import { isNullOrEmpty, isNullOrUndefined, iterateObject, sortObjectByKey } from '../utils';
import { ResourceElement } from './resourceElement';
import { TreeElement } from './treeElement';

export abstract class CategoryLikeTreeElement<TModel extends ILhqCategoryLikeModelType = ILhqCategoryLikeModelType> extends TreeElement<TModel> implements ICategoryLikeTreeElement {
    protected _categories: CategoryLikeTreeElement[] | undefined;
    protected _resources: ResourceElement[] | undefined;
    protected _hasCategories = false;
    protected _hasResources = false;

    constructor(root: IRootModelElement, elementType: TreeElementType, name: string,
        parent: ICategoryLikeTreeElement | undefined) {
        super(root, elementType, name, parent);
    }

    protected abstract createCategory(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement | undefined): CategoryLikeTreeElement;

    public mapToModel(): TModel {
        const model: Partial<TModel> = {};
        this.bindToModel(model);
        return model as TModel;
    }

    protected bindToModel(model: Partial<TModel>): void {
        if (model) {
            model.categories = (this._categories === undefined) || this._categories.length === 0
                ? undefined
                : Object.fromEntries(this._categories.map(x => [x.name, x.mapToModel()]));

            model.resources = (this._resources === undefined) || this._resources.length === 0
                ? undefined
                : Object.fromEntries(this._resources.map(x => [x.name, x.mapToModel()]));
        }
    }

    public populate(source: TModel | undefined): void {
        if (source) {
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

    public addCategory(name: string): ICategoryElement {
        if (isNullOrUndefined(name)) {
            throw new Error('Category name cannot be null or undefined.');
        }

        const category = this.createCategory(this.root, name, this);
        this._categories ??= [];
        this._categories.push(category);
        this._hasCategories = true;
        return category;
    }

    public removeCategory(name: string): void {
        if (this._categories && !isNullOrEmpty(name)) {
            const index = this._categories.findIndex(x => x.name === name);
            if (index !== -1) {
                this._categories.splice(index, 1);
                this._hasCategories = this._categories.length > 0;
            }
        }
    }

    public addResource(name: string): IResourceElement {
        if (isNullOrUndefined(name)) {
            throw new Error('Resource name cannot be null or undefined.');
        }

        const resource = new ResourceElement(this.root, name, this);
        this._resources ??= [];
        this._resources.push(resource);
        this._hasResources = true;
        return resource;
    }

    public removeResource(name: string): void {
        if (this._resources && !isNullOrEmpty(name)) {
            const index = this._resources.findIndex(x => x.name === name);
            if (index !== -1) {
                this._resources.splice(index, 1);
                this._hasResources = this._resources.length > 0;
            }
        }
    }
}
