import { CategoryLikeTreeElement } from './categoryLikeTreeElement';
import type { LhqModelDataNode } from '../api/schemas';
import { LhqModelUidSchema, type LhqCodeGenVersion, type LhqModel, type LhqModelMetadata, type LhqModelOptions, type LhqModelUid, type LhqModelVersion } from '../api/schemas';
import type { ICategoryLikeTreeElement, ICodeGeneratorElement, IRootModelElement, ITreeElement } from '../api/modelTypes';
import { isNullOrEmpty, isNullOrUndefined } from '../utils';
import { ModelVersions } from './modelConst';
import { CategoryElement } from './categoryElement';

const CodeGenUID = 'b40c8a1d-23b7-4f78-991b-c24898596dd2';

export class RootModelElement extends CategoryLikeTreeElement<LhqModel> implements IRootModelElement {
    private _uid: LhqModelUid = LhqModelUidSchema.value;
    private _version: LhqModelVersion = ModelVersions.model;
    private _options: LhqModelOptions = { categories: true, resources: 'All' };
    private _primaryLanguage = 'en';
    private _languages: string[] = ['en'];
    private _metadatas: Readonly<LhqModelMetadata> | undefined;
    private _codeGenerator: ICodeGeneratorElement | undefined;
    private _hasLanguages = true;

    constructor(model: LhqModel | undefined) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super(undefined, 'model', model?.model?.name ?? '', undefined);
        this.populate(model);
    }

    public populate(model: LhqModel | undefined): void {
        if (model) {
            this._uid = model.model.uid;
            this._version = model.model.version;
            this._options = { categories: model.model.options.categories, resources: model.model.options.resources };
            this._primaryLanguage = model.model.primaryLanguage;
            this._languages = [...model.languages];
            this._hasLanguages = this._languages.length > 0;
            this._metadatas = model.metadatas ? Object.freeze({ ...model.metadatas }) : undefined;
            this._codeGenerator = this.getCodeGenerator(model);
            //this.populate(model.categories, model.resources);
        } else {
            this._uid = LhqModelUidSchema.value;
            this._version = ModelVersions.model;
            this._options = { categories: true, resources: 'All' };
            this._primaryLanguage = 'en';
            this._languages = ['en'];
            this._hasLanguages = true;
        }

        super.populate(model);
    }

    protected bindToModel(model: Partial<LhqModel>): void {
        super.bindToModel(model);
        model.model = {
            uid: this._uid,
            version: this._version,
            options: this._options,
            name: this.name,
            description: this._description,
            primaryLanguage: this._primaryLanguage
        };
        model.languages = this._languages;
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
            return { templateId, settings: node, version: codeGenVersion };
        }

        return undefined;
    }

    private createCodeGenerator(codeGeneratorElement: ICodeGeneratorElement): ICodeGeneratorElement {
        if (isNullOrUndefined(codeGeneratorElement)) {
            throw new Error('Code generator element is undefined or null.');
        }

        const templateId = codeGeneratorElement.templateId;
        const settings = Object.assign({}, codeGeneratorElement.settings ?? {});
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

        let contentElem = metadata.childs?.find(x => x.name === 'content');
        if (!contentElem) {
            contentElem = { name: 'content', childs: [], attrs: {} };
            metadataElem.childs.push(contentElem);
        }
        contentElem.name = 'content';
        contentElem.attrs ??= {};
        contentElem.attrs['templateId'] = templateId;
        contentElem.attrs['version'] = codeGenVersion.toFixed(0);
        contentElem.childs ??= [];

        settings.name = 'Settings';
        const settingsIdx = contentElem.childs.findIndex(x => x.name === 'Settings');
        if (settingsIdx === -1) {
            contentElem.childs.push(settings);
        } else {
            contentElem.childs[settingsIdx] = settings;
        }

        this._metadatas = Object.freeze(metadata);
        return { templateId, settings, version: codeGenVersion };
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

    get primaryLanguage(): string {
        return this._primaryLanguage;
    }

    set primaryLanguage(primaryLanguage: string) {
        this._primaryLanguage = primaryLanguage;
    }

    get languages(): readonly string[] {
        return this._languages;
    }

    set languages(languages: string[]) {
        this._languages = [...languages];
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
}