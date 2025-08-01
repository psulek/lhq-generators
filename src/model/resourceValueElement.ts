import type { LhqModelResourceValue } from '../api/schemas';
import type { IResourceElement, IResourceValueElement } from '../api/modelTypes';
import { isNullOrEmpty } from '../utils';

export class ResourceValueElement implements IResourceValueElement {
    private _languageName: string;
    private _value: string | undefined;
    private _locked: boolean | undefined;
    private _auto: boolean | undefined;
    private _parent: Readonly<IResourceElement>;

    constructor(languageName: string, source: LhqModelResourceValue | undefined, parent: Readonly<IResourceElement>) {
        this._languageName = languageName;
        this._parent = parent;
        this._value = source?.value;
        this._locked = source?.locked;
        this._auto = source?.auto;
    }

    public toJson(): Record<string, unknown> {
        return {
            languageName: this.languageName ?? '',
            value: this.value ?? '',
            locked: this.locked ?? false,
            auto: this.auto ?? false,
            // skip: parent: undefined,
        };
    }

    public mapToModel(): LhqModelResourceValue {
        return {
            value: isNullOrEmpty(this._value) ? undefined : this._value,
            locked: this._locked,
            auto: this._auto
        };
    }

    get languageName(): string {
        return this._languageName;
    }

    get value(): string | undefined {
        return this._value;
    }

    set value(value: string | undefined) {
        this._value = value;
    }

    get locked(): boolean | undefined {
        return this._locked;
    }

    set locked(locked: boolean | undefined) {
        this._locked = locked;
    }

    get auto(): boolean | undefined {
        return this._auto;
    }

    set auto(value: boolean | undefined) {
        this._auto = value;
    }

    get parent(): Readonly<IResourceElement> {
        return this._parent;
    }
}