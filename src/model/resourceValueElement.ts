import type { LhqModelResourceValue } from '../api/schemas';
import type { IResourceElement, IResourceValueElement } from '../api/modelTypes';
import { isNullOrEmpty, updateEOL } from '../utils';
import type { MapToModelOptions } from './types';
import { ResourceValueValidations } from './modelConst';

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

    public assign(other: Partial<IResourceValueElement>): boolean {
        if (!other) {
            throw new Error('Cannot assign from undefined or null.');
        }

        let changed = false;

        if (other.auto !== this.auto) {
            this._auto = other.auto;
            changed = true;
        }

        if (other.locked !== this.locked) {
            this._locked = other.locked;
            changed = true;
        }

        if (other.languageName !== this.languageName && !isNullOrEmpty(other.languageName)) {
            this._languageName = other.languageName;
            changed = true;
        }

        if (other.value !== this.value) {
            this._value = other.value;
            changed = true;
        }

        return changed;
    }

    public get isAllEmpty(): boolean {
        return isNullOrEmpty(this._value) && this._locked === undefined && this._auto === undefined;
    }

    public mapToModel(options?: MapToModelOptions): LhqModelResourceValue {
        return {
            value: this.getSanitizedValue(options),
            locked: this._locked === true ? true : undefined,
            auto: this._auto === true ? true : undefined
        };
    }

    private getSanitizedValue(options?: MapToModelOptions): string | undefined {
        if (isNullOrEmpty(this._value)) {
            return undefined;
        }

        const eol = options?.values?.eol;
        const sanitize = options?.values?.sanitize ?? false;

        let value = eol ? updateEOL(this._value, eol) : this._value;

        if (sanitize) {
            value = value
                .replace(ResourceValueValidations.nonBreakingSpace, ' ')
                .replace(ResourceValueValidations.noSupportedChars, '');
        }

        return value;
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