import type { ILhqModelType, LhqModelResourceParameter } from '../api/schemas';
import type { IResourceElement, IResourceParameterElement } from '../api/modelTypes';

export class ResourceParameterElement implements IResourceParameterElement, ILhqModelType {
    private _name: string;
    private _description: string | undefined;
    private _order: number;
    private _parent: IResourceElement;

    constructor(name: string, source: LhqModelResourceParameter | undefined, parent: IResourceElement) {
        this._name = name;
        this._description = source?.description;
        this._order = source?.order ?? 0;
        this._parent = parent;
    }

    public mapToModel(): LhqModelResourceParameter {
        return {            
            description: this._description,
            order: this._order
        };
    }

    public get name(): string {
        return this._name;
    }

    public set name(name: string) {
        this._name = name;
    }

    public get parent(): Readonly<IResourceElement> {
        return this._parent;
    }
    
    public get description(): string | undefined {
        return this._description;
    }

    public set description(description: string | undefined) {
        this._description = description;
    }

    public get order(): number {
        return this._order;
    }

    public set order(order: number) {
        this._order = order;
    }
}

