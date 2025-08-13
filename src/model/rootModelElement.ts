import { CategoryLikeTreeElement } from './categoryLikeTreeElement';
import type { LhqModelDataNode, LhqModelProperties } from '../api/schemas';
import { LhqModelUidSchema, type LhqCodeGenVersion, type LhqModel, type LhqModelMetadata, type LhqModelOptions, type LhqModelUid, type LhqModelVersion } from '../api/schemas';
import type { ICategoryLikeTreeElement, ICodeGeneratorElement, ICodeGeneratorSettingsConvertor, IRootModelElement, IterateTreeCallback, IterateTreeOptions, ITreeElement, TreeElementType } from '../api/modelTypes';
import { arrayAddSorted, arraySortBy, DefaultValueComparer, isNullOrEmpty, isNullOrUndefined, strCompare } from '../utils';
import { ModelVersions } from './modelConst';
import { CategoryElement } from './categoryElement';
import { ResourceElement } from './resourceElement';
import type { MapToModelOptions } from './types';

const CodeGenUID = 'b40c8a1d-23b7-4f78-991b-c24898596dd2';

const defaultModelOptions: LhqModelOptions = { categories: true, resources: 'All' };

export class RootModelElement extends CategoryLikeTreeElement<LhqModel> implements IRootModelElement {
    private _uid: LhqModelUid = LhqModelUidSchema.value;
    private _version: LhqModelVersion = ModelVersions.model;
    private _options: LhqModelOptions = defaultModelOptions;
    private _primaryLanguage: string | undefined;
    private _languages: string[] = [];
    private _metadatas: Readonly<LhqModelMetadata> | undefined;
    private _codeGenerator: ICodeGeneratorElement | undefined;
    private _hasLanguages = true;
    private _codeGenSettingsConvertor: ICodeGeneratorSettingsConvertor;

    constructor(model: LhqModel | undefined, codeGenSettingsConvertor: ICodeGeneratorSettingsConvertor) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super(undefined, 'model', model?.model?.name ?? '', undefined);

        if (isNullOrEmpty(codeGenSettingsConvertor)) {
            throw new Error('Parameter "codeGenSettingsConvertor" cannot be null or undefined.');
        }

        this._codeGenSettingsConvertor = codeGenSettingsConvertor;

        this.populate(model);
    }

    protected internalToJson(obj: Record<string, unknown>, options?: { includeData?: boolean; }): void {
        super.internalToJson(obj, options);
        obj.uid = this.uid ?? LhqModelUidSchema.value;
        obj.version = this.version ?? ModelVersions.model;
        obj.options = this.options ?? defaultModelOptions;
        obj.primaryLanguage = this.primaryLanguage ?? '';
        obj.languages = this.languages ? [...this._languages] : [];
        obj.hasLanguages = this.hasLanguages;

        const includeData = options?.includeData ?? false;
        obj.metadatas = this.metadatas && includeData ? JSON.parse(JSON.stringify(this.metadatas)) : undefined;
        // skip 'codeGenerator' ? 
        // obj.codeGenerator = this._codeGenerator ? { ...this._codeGenerator } : undefined;
    }

    public populate(model: LhqModel | undefined): void {
        if (model) {
            this._uid = model.model.uid;
            this._version = model.model.version;
            this._options = { categories: model.model.options.categories, resources: model.model.options.resources };
            this._languages = model.languages ? [...model.languages.filter(x => !isNullOrEmpty(x))] : [];
            this._primaryLanguage = model.model.primaryLanguage;
            // if (this.containsLanguage(model.model.primaryLanguage)) {
            //     this._primaryLanguage = model.model.primaryLanguage;
            // } else {
            //     this._primaryLanguage = this._languages.length > 0 ? this._languages[0] : undefined;
            // }
            this._hasLanguages = this._languages.length > 0;
            this._metadatas = model.metadatas ? Object.freeze({ ...model.metadatas }) : undefined;
            this._codeGenerator = this.getCodeGenerator(model);
            this._description = model.model.description;
        } else {
            this._uid = LhqModelUidSchema.value;
            this._version = ModelVersions.model;
            this._options = { categories: true, resources: 'All' };
            this._languages = [];
            //this._primaryLanguage = '';
            this._hasLanguages = true;
        }

        super.populate(model);
    }

    protected bindToModel(model: Partial<LhqModel>, options?: MapToModelOptions): void {
        let primaryLang = this._primaryLanguage;
        if (isNullOrEmpty(primaryLang) && this._languages.length > 0) {
            primaryLang = this._languages[0] ?? '';
        }

        const properties: Partial<LhqModelProperties> = {
            uid: this._uid,
            version: this._version,
        };

        properties.description = isNullOrEmpty(this._description) ? undefined : this._description;
        properties.options = this._options;
        properties.name = this._name
        properties.primaryLanguage = primaryLang;

        model.model = properties as LhqModelProperties;

        // const langs = [];
        // if (this._hasLanguages) {
        //     if (!isNullOrEmpty(primaryLang) && this._languages.includes(primaryLang)) {
        //         langs.push(primaryLang);
        //     }

        //     langs.push(...arraySortBy(this._languages.filter(x => !isNullOrEmpty(x) && x !== primaryLang), x => x, 'asc'));
        // }

        model.languages = this._languages ?? [];

        super.bindToModel(model, options);
        model.metadatas = this._metadatas;
    }

    protected createCategory(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement | undefined): CategoryLikeTreeElement {
        return new CategoryElement(root, name, parent);
    }

    private getCodeGenerator(model: LhqModel): ICodeGeneratorElement | undefined {
        let templateId: string | null | undefined = '';
        let codeGenVersion: LhqCodeGenVersion = 1;
        let node = model.metadatas?.childs?.find(x => x.name === 'metadata' && x.attrs?.['descriptorUID'] === CodeGenUID);
        if (node) {
            node = node.childs?.find(x => x.name === 'content' && x.attrs?.['templateId'] !== undefined);
            if (node) {
                templateId = node.attrs!['templateId'];
                const version = node.attrs!['version'];
                if (!isNullOrEmpty(version)) {
                    const versionInt = parseInt(version);
                    if (versionInt > 0 && versionInt <= ModelVersions.codeGenerator) {
                        codeGenVersion = versionInt as LhqCodeGenVersion;
                    }
                }
                node = node.childs?.find(x => x.name === 'Settings' && (x.childs?.length ?? 0) > 0);
            }
        }

        if (!isNullOrEmpty(templateId) && !isNullOrEmpty(node)) {
            const settings = this._codeGenSettingsConvertor.nodeToSettings(templateId, node);
            if (isNullOrUndefined(settings)) {
                throw new Error('Conversion from node to "CodeGeneratorGroupSettings" failed.');
            }

            return { templateId, settings, version: codeGenVersion };
        }

        return undefined;
    }

    private createCodeGenerator(codeGeneratorElement: ICodeGeneratorElement): ICodeGeneratorElement {
        if (isNullOrUndefined(codeGeneratorElement)) {
            throw new Error('Code generator element is undefined or null.');
        }

        const templateId = codeGeneratorElement.templateId;
        const codeGenVersion = codeGeneratorElement.version > 0 && codeGeneratorElement.version <= ModelVersions.codeGenerator
            ? codeGeneratorElement.version
            : ModelVersions.codeGenerator;

        const metadata: LhqModelMetadata = Object.assign({}, this._metadatas ?? {});
        metadata.childs ??= [];
        let metadataElem = metadata.childs.find(x => x.name === 'metadata' && x.attrs?.['descriptorUID'] === CodeGenUID);
        if (!metadataElem) {
            metadataElem = { name: 'metadata', attrs: { descriptorUID: CodeGenUID }, childs: [] };
            metadata.childs.push(metadataElem);
        }
        metadataElem.name = 'metadata';
        metadataElem.childs ??= [];
        metadataElem.attrs ??= {};
        metadataElem.attrs['descriptorUID'] = CodeGenUID;

        let contentElem = metadataElem.childs?.find(x => x.name === 'content');
        if (!contentElem) {
            contentElem = { name: 'content', childs: [], attrs: {} };
            metadataElem.childs.push(contentElem);
        }
        contentElem.name = 'content';
        contentElem.attrs ??= {};
        contentElem.attrs['templateId'] = templateId;
        contentElem.attrs['version'] = codeGenVersion.toFixed(0);
        contentElem.childs ??= [];

        /**
         * Corrects the attribute values of the node and its children to ensure they are strings.
         */
        function correctAttrsValues(node: LhqModelDataNode): void {
            if (node.attrs) {
                for (const key of Object.keys(node.attrs)) {
                    const value = node.attrs[key] as unknown;
                    if (value !== undefined && value !== null && typeof value !== 'string') {
                        // eslint-disable-next-line @typescript-eslint/no-base-to-string
                        node.attrs[key] = value.toString()?.toLowerCase();
                    }
                }
            }

            if (node.childs) {
                for (const child of node.childs) {
                    correctAttrsValues(child);
                }
            }
        }

        const settings = this._codeGenSettingsConvertor.settingsToNode(templateId, codeGeneratorElement.settings ?? {});
        correctAttrsValues(settings);

        const settingsIdx = contentElem.childs.findIndex(x => x.name === 'Settings');
        if (settingsIdx === -1) {
            contentElem.childs.push(settings);
        } else {
            contentElem.childs[settingsIdx] = settings;
        }

        this._metadatas = Object.freeze(metadata);
        return { templateId, settings: codeGeneratorElement.settings, version: codeGenVersion };
    }

    get uid(): LhqModelUid {
        return this._uid;
    }

    get version(): LhqModelVersion {
        return this._version;
    }

    get options(): Readonly<LhqModelOptions> {
        return this._options;
    }

    set options(options: LhqModelOptions) {
        this._options = options;
    }

    get primaryLanguage(): string | undefined {
        return this._primaryLanguage;
    }

    set primaryLanguage(value: string | undefined) {
        // if (value && !this.containsLanguage(value, true)) {
        //     throw new Error(`Cannot set language "${value}" as primary as this language does not exist in the model languages.`);
        // }

        this._primaryLanguage = value;
    }

    get languages(): readonly string[] {
        return this._languages;
    }

    set languages(languages: string[]) {
        if (isNullOrUndefined(languages)) {
            throw new Error('Languages cannot be null or undefined.');
        }

        if (!Array.isArray(languages)) {
            throw new Error('Languages must be an array of strings.');
        }

        this._languages = [...languages];
        this._hasLanguages = this._languages.length > 0;
    }

    get hasLanguages(): boolean {
        return this._hasLanguages;
    }

    get metadatas(): Readonly<LhqModelMetadata> | undefined {
        return this._metadatas;
    }

    set metadatas(metadatas: LhqModelMetadata) {
        this._metadatas = Object.freeze({ ...metadatas });
    }

    get codeGenerator(): ICodeGeneratorElement | undefined {
        return this._codeGenerator;
    }

    set codeGenerator(value: ICodeGeneratorElement) {
        if (isNullOrUndefined(value)) {
            this._codeGenerator = value;
        } else {
            this._codeGenerator = this.createCodeGenerator(value);
        }
    }

    public addLanguages(languages: string[], primaryLanguage?: string): boolean {
        if (isNullOrUndefined(languages) || languages.length === 0) {
            return false;
        }

        if (isNullOrEmpty(primaryLanguage)) {
            primaryLanguage = languages[0];
        }

        let added = false;
        for (const language of languages.filter(lang => !isNullOrEmpty(lang))) {
            if (this.addLanguage(language, primaryLanguage === language)) {
                added = true;
            }
        }

        return added;
    }

    public addLanguage(language: string, isPrimary?: boolean): boolean {
        const contains = this.containsLanguage(language);
        if (!contains) {
            this._languages.push(language);

            //arrayAddSorted(this._languages, language, x => DefaultValueComparer(x, language));

            if (isPrimary === true) {
                this.primaryLanguage = language;
            }
            this._hasLanguages = true;
        }
        return !contains;
    }

    public findLanguage(language: string, ignoreCase?: boolean): string | undefined {
        return this._languages.find(lang => strCompare(lang, language, ignoreCase ?? true));
    }

    public containsLanguage(language: string, ignoreCase?: boolean): boolean {
        return this._languages.some(lang => strCompare(lang, language, ignoreCase ?? true));
    }

    public removeLanguage(language: string, ignoreCase?: boolean): boolean {
        // const idx = this._languages.indexOf(language);
        const idx = this._languages.findIndex(lang => strCompare(lang, language, ignoreCase ?? true));

        const contains = idx > -1;
        if (contains) {
            this._languages.splice(idx, 1);
            this._hasLanguages = this._languages.length > 0;

            this.iterateTree(elem => {
                if (elem instanceof ResourceElement) {
                    elem.removeValue(language);
                }

            }, { resources: true });
        }

        return contains;
    }

    public iterateTree(callback: IterateTreeCallback, options?: IterateTreeOptions): boolean {
        options = options ?? { root: true, categories: true, resources: true };

        const includes: Record<TreeElementType, boolean> = {
            model: options.root ?? false,
            category: options.categories ?? false,
            resource: options.resources ?? false
        };

        const iterate = (element: ITreeElement, leaf: boolean): boolean => {
            const result = includes[element.elementType] ? callback(element, leaf) : true;
            if (result === false) {
                return false;
            }

            if (element instanceof CategoryLikeTreeElement) {
                const lastCategory = element.categories.length === 0 ? undefined : element.categories[element.categories.length - 1];
                for (const category of element.categories) {
                    if (iterate(category, category === lastCategory) === false) {
                        return false;
                    }
                }

                const lastResource = element.resources.length === 0 ? undefined : element.resources[element.resources.length - 1];
                for (const resource of element.resources) {
                    if (iterate(resource, resource === lastResource) === false) {
                        return false;
                    }
                }
            }

            return true;
        }

        return iterate(this, true);
    }
}