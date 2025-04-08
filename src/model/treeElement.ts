import { isNullOrEmpty } from '../utils';
import type { ITreeElement, ICategoryLikeTreeElement, IRootModelElement, TreeElementType, ITreeElementPaths } from '../api/modelTypes';
import { TreeElementPaths } from './treeElementPaths';
import type { ILhqModelType } from '../api/schemas';

export abstract class TreeElement<TModel extends ILhqModelType> implements ITreeElement {
    protected _parent: ICategoryLikeTreeElement | undefined;
    protected _root: IRootModelElement;
    protected _name: string;
    protected _elementType: TreeElementType;
    protected _description: string | undefined;
    protected _paths: ITreeElementPaths;
    protected _isRoot: boolean;
    protected _data: Record<string, unknown>;

    constructor(root: IRootModelElement, elementType: TreeElementType, name: string,
        parent: ICategoryLikeTreeElement | undefined) {

        this._name = name ?? '';
        this._elementType = elementType;
        this._root = isNullOrEmpty(root) && isNullOrEmpty(parent) ? this as unknown as IRootModelElement : root;
        this._parent = parent;
        this._paths = new TreeElementPaths(this);
        this._isRoot = isNullOrEmpty(this.parent);
        this._data = {};
    }

    public abstract populate(source: TModel | undefined): void;

    public abstract mapToModel(): TModel;

    public addToTempData = (key: string, value: unknown): void => {
        this._data[key] = value;
    }

    public clearTempData = (): void => {
        this._data = {};
    }

    public get isRoot(): boolean {
        return this._isRoot;
    }

    public get root(): IRootModelElement {
        return this._root;
    }

    public get parent(): Readonly<ICategoryLikeTreeElement | undefined> {
        return this._parent;
    }

    public get data(): Readonly<Record<string, unknown>> {
        return this._data;
    }

    public get name(): string {
        return this._name;
    }

    public set name(name: string) {
        this._name = name;
    }

    public get elementType(): TreeElementType {
        return this._elementType;
    }

    public get description(): string | undefined {
        return this._description;
    }

    public set description(description: string) {
        this._description = description;
    }
    
    public get paths(): Readonly<ITreeElementPaths> {
        return this._paths;
    }
}