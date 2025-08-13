import { isNullOrEmpty } from '../utils';
import type { ITreeElement, ICategoryLikeTreeElement, IRootModelElement, TreeElementType, ITreeElementPaths, CategoryOrResourceType, TreeElementToJsonOptions } from '../api/modelTypes';
import { TreeElementPaths } from './treeElementPaths';
import type { ILhqModelType } from '../api/schemas';
import type { ICategoryLikeTreeElementOperations, MapToModelOptions } from './types';

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
    abstract getLevel(): number;

    abstract addToTempData(key: string, value: unknown): void;
    abstract clearTempData(): void;
    
    protected abstract nameChanged(): void;
    protected abstract internalToJson<TOptions extends TreeElementToJsonOptions>(obj: Record<string, unknown>, options?: TOptions): void;

    public toJson<TOptions extends TreeElementToJsonOptions>(options?: TOptions): Record<string, unknown> {
        const obj: Record<string, unknown> = {
            isRoot: this.isRoot,
            // skip: root: undefined, 
            // skip: parent: undefined,
            name: this.name ?? '',
            elementType: this.elementType,
            description: this.description ?? '',
            paths: this.paths ? this.paths.toJson() : {}
        };

        if (options?.includeData === true) {
            obj.data = JSON.parse(JSON.stringify(this.data));
        }

        this.internalToJson(obj, options);

        return obj;
    }

    public debugSerialize(): string {
        return JSON.stringify(this.toJson({ includeData: true }), null, 2);
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

    public mapToModel(options?: MapToModelOptions): TModel {
        const model: Partial<TModel> = {};
        this.bindToModel(model, options);

        const keepData = options?.keepData ?? false;
        const keepDataKeys = options?.keepDataKeys;

        if (keepData === true && !isNullOrEmpty(this._data)) {
            const dataKeys = keepDataKeys ?? Object.keys(this._data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            (model as any)._data = {};
            
            for (const [key, value] of Object.entries(this._data)) {
                if (dataKeys.includes(key)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                    (model as any)._data[key] = value;
                }
            }
        }
        return model as TModel;
    }

    protected abstract bindToModel(model: Partial<TModel>, options?: MapToModelOptions): void;

    public addToTempData = (key: string, value: unknown): void => {
        this._data[key] = value;
    }

    public clearTempData = (): void => {
        this._data = {};
    }

    public changeParent(newParent: ICategoryLikeTreeElement | undefined): boolean {
        // cant change if its the root or if new parent is resource
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

        if (this.elementType !== 'resource' && Object.is(newParent, this)) {
            return false;
        }

        const elemType = this.elementType as CategoryOrResourceType;

        if (newParent.contains(this.name, elemType)) {
            return false;
        }

        (this.parent ?? this.root).removeElement(this);

        (newParent as unknown as ICategoryLikeTreeElementOperations).addElement(this);

        this._parent = newParent;

        (this._paths as TreeElementPaths).refresh(this);

        return true;
    }

    public getLevel(): number {
        let level = 0;
        let current: ICategoryLikeTreeElement | undefined = this._parent;

        while (current) {
            level++;
            current = current.parent;
        }

        return level;
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
            this.nameChanged();
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