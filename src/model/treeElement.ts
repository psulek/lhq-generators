import { isNullOrEmpty } from '../utils';
import type { ITreeElement, ICategoryLikeTreeElement, IRootModelElement, TreeElementType, ITreeElementPaths } from '../api/modelTypes';
import { TreeElementPaths } from './treeElementPaths';
import type { ILhqModelType } from '../api/schemas';
import type { ICategoryLikeTreeElementOperations } from './types';

export abstract class TreeElementBase implements ITreeElement {
    abstract get isRoot(): boolean;
    abstract get root(): IRootModelElement;
    abstract get parent(): Readonly<ICategoryLikeTreeElement | undefined>;
    abstract get data(): Readonly<Record<string, unknown>>;
    abstract get name(): string;
    abstract set name(name: string);
    abstract get elementType(): TreeElementType;
    abstract get description(): string | undefined;
    abstract set description(description: string);
    abstract get paths(): Readonly<ITreeElementPaths>;

    abstract changeParent(newParent: ICategoryLikeTreeElement | undefined): boolean;

    public debugSerialize(): string {
        const seen = new WeakSet<ITreeElement>();
        return JSON.stringify(this, (key, value) => {
            if (key === '_parent' || key === '_root') {
                return undefined; // Exclude parent and root from serialization
            }

            if (typeof value === 'object' && value !== null) {
                if (seen.has(value as ITreeElement)) {
                    return `[Circular: ${(value as ITreeElement).name}]`;
                }
                seen.add(value as ITreeElement);
            }

            return value as ITreeElement;
        }, 2);
    }
}

export abstract class TreeElement<TModel extends ILhqModelType> extends TreeElementBase {
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
        super();

        this._name = name ?? '';
        this._elementType = elementType;
        this._root = isNullOrEmpty(root) && isNullOrEmpty(parent) ? this as unknown as IRootModelElement : root;
        this._isRoot = isNullOrEmpty(parent);
        this._parent = parent;
        this._paths = new TreeElementPaths(this);
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

    public changeParent(newParent: ICategoryLikeTreeElement | undefined): boolean {
        // cant change if its the root or if its resource element
        if (this.isRoot || (newParent?.elementType === 'resource')) {
            return false;
        }

        if (newParent === undefined) {
            newParent = this.root;
        }

        // Check if the new parent is the same as the current parent
        if (newParent === this._parent) {
            return true;
        }

        const elemType = this.elementType as Exclude<TreeElementType, 'model'>;

        //if (newParent.getElementByPath(TreeElementPaths.parse(this.name, '/'), elemType)) {
        if (newParent.hasElement(this.name, elemType)) {
            return false;
        }

        (this.parent ?? this.root).removeElement(this);

        (newParent as unknown as ICategoryLikeTreeElementOperations).addElement(this);

        this._parent = newParent;

        (this._paths as TreeElementPaths).refresh(this);

        return true;
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
        if (this._name !== name) {
            this._name = name;
            (this._paths as TreeElementPaths).refresh(this);
        }
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