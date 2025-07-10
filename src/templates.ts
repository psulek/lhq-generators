import type { CodeGeneratorCsharpSettings, CodeGeneratorResXSettings, CodeGeneratorTypescriptJsonSettings, CodeGeneratorTypescriptSettings } from './api/modelTypes';
import type { LhqModelDataNode } from './api/schemas';
import { DefaultCodeGenSettings } from './model/modelConst';

function createCsharpSettings(csharp: Partial<CodeGeneratorCsharpSettings>): LhqModelDataNode {
    csharp = Object.assign({}, DefaultCodeGenSettings, csharp);

    const node: LhqModelDataNode = {
        name: 'CSharp',
        attrs: {
            Enabled: (csharp.Enabled ?? true).toString()?.toLowerCase(),
            OutputFolder: (csharp.OutputFolder ?? 'Resources'),
            EncodingWithBOM: (csharp.EncodingWithBOM ?? false).toString()?.toLowerCase(),
            LineEndings: csharp.LineEndings ?? 'LF',
            OutputProjectName: csharp.OutputProjectName,
            UseExpressionBodySyntax: csharp.UseExpressionBodySyntax?.toString()?.toLowerCase(),
            MissingTranslationFallbackToPrimary: csharp.MissingTranslationFallbackToPrimary?.toString()?.toLowerCase(),
            Namespace: csharp.Namespace,
        }
    };
    return node;
}

function createResxSettings(resx: Partial<CodeGeneratorResXSettings>): LhqModelDataNode {
    resx = Object.assign({}, DefaultCodeGenSettings, resx);
    const node: LhqModelDataNode = {
        name: 'ResX',
        attrs: {
            Enabled: (resx.Enabled ?? true).toString()?.toLowerCase(),
            OutputFolder: (resx.OutputFolder ?? 'Resources'),
            EncodingWithBOM: (resx.EncodingWithBOM ?? false).toString()?.toLowerCase(),
            LineEndings: resx.LineEndings ?? 'LF',
            OutputProjectName: resx.OutputProjectName,
            CultureCodeInFileNameForPrimaryLanguage: resx.CultureCodeInFileNameForPrimaryLanguage?.toString()?.toLowerCase(),
            CompatibleTextEncoding: resx.CompatibleTextEncoding?.toString()?.toLowerCase(),
        }
    };
    return node;
}

function createTypescriptSettings(ts: Partial<CodeGeneratorTypescriptSettings>): LhqModelDataNode {
    ts = Object.assign({}, DefaultCodeGenSettings, ts);
    const node: LhqModelDataNode = {
        name: 'Typescript',
        attrs: {
            Enabled: (ts.Enabled ?? true).toString()?.toLowerCase(),
            OutputFolder: ts.OutputFolder ?? 'typings',
            EncodingWithBOM: (ts.EncodingWithBOM ?? false).toString()?.toLowerCase(),
            LineEndings: ts.LineEndings ?? 'LF',
            OutputProjectName: ts.OutputProjectName,
            AmbientNamespaceName: ts.AmbientNamespaceName,
            InterfacePrefix: ts.InterfacePrefix
        }
    };
    return node;
}

function createTypescriptJsonSettings(json: Partial<CodeGeneratorTypescriptJsonSettings>): LhqModelDataNode {
    json = Object.assign({}, DefaultCodeGenSettings, json);
    const node: LhqModelDataNode = {
        name: 'Json',
        attrs: {
            Enabled: (json.Enabled ?? true).toString()?.toLowerCase(),
            OutputFolder: json.OutputFolder ?? 'Resources',
            EncodingWithBOM: (json.EncodingWithBOM ?? false).toString()?.toLowerCase(),
            LineEndings: json.LineEndings ?? 'LF',
            OutputProjectName: json.OutputProjectName,
            CultureCodeInFileNameForPrimaryLanguage: json.CultureCodeInFileNameForPrimaryLanguage?.toString()?.toLowerCase(),
            MetadataFileNameSuffix: json.MetadataFileNameSuffix ?? 'metadata',
            WriteEmptyValues: json.WriteEmptyValues?.toString()?.toLowerCase()
        }
    };
    return node;
}

export type BuildinTemplateId = 'NetCoreResxCsharp01' | 'NetFwResxCsharp01' | 'WinFormsResxCsharp01' | 'WpfResxCsharp01' | 'TypescriptJson01';

export type TemplateSettingsMap = {
    NetCoreResxCsharp01: {
        csharp: Partial<CodeGeneratorCsharpSettings>;
        resx: Partial<CodeGeneratorResXSettings>;
    };
    NetFwResxCsharp01: {
        csharp: Partial<CodeGeneratorCsharpSettings>;
        resx: Partial<CodeGeneratorResXSettings>;
    };
    WinFormsResxCsharp01: {
        csharp: Partial<CodeGeneratorCsharpSettings>;
        resx: Partial<CodeGeneratorResXSettings>;
    };
    WpfResxCsharp01: {
        csharp: Partial<CodeGeneratorCsharpSettings>;
        resx: Partial<CodeGeneratorResXSettings>;
    };
    TypescriptJson01: {
        typescript: Partial<CodeGeneratorTypescriptSettings>;
        json: Partial<CodeGeneratorTypescriptJsonSettings>;
    };
};

export type TemplateSettingsType = {
    [K in BuildinTemplateId]: {
        id: K;
        settings?: TemplateSettingsMap[K];
    }
}[BuildinTemplateId];

export class TemplateSettings {
    public static create(settings: TemplateSettingsType): LhqModelDataNode {
        const node: LhqModelDataNode = {
            name: 'Settings',
            childs: []
        };

        if (settings.id === 'TypescriptJson01') {
            node.childs!.push(createTypescriptSettings(settings.settings?.typescript ?? {}));
            node.childs!.push(createTypescriptJsonSettings(settings.settings?.json ?? {}));
        }  else {
            node.childs!.push(createCsharpSettings(settings.settings?.csharp ?? {}));
            node.childs!.push(createResxSettings(settings.settings?.resx ?? {}));
        }

        return node;
    }
}
