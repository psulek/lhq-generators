/* eslint-disable no-prototype-builtins */
import Handlebars from 'handlebars';
import { AppError } from './AppError';
import { getKnownHelpers } from './helpers';
import type { HbsTemplatesData } from './types';
import { isNullOrEmpty } from './utils';
import { type TemplateMetadataDefinition, type TemplatesMetadata } from './api/templates';
import { validateTemplateMetadata } from './generatorUtils';

export class HbsTemplateManager {
    private static _initialized = false;
    private static _sources: HbsTemplatesData;
    private static _metadata: TemplatesMetadata;
    // key - templateId, value - template metadata definition
    private static _definitions: Record<string, TemplateMetadataDefinition>;

    private static _compiled: {
        [templateId: string]: HandlebarsTemplateDelegate;
    };

    public static init(data: HbsTemplatesData, metadata: TemplatesMetadata): void {
        HbsTemplateManager._initialized = false;

        if (isNullOrEmpty(data)) {
            throw new Error('Missing templates data !');
        }

        const templateIds = Object.keys(data);
        if (templateIds.length === 0) {
            throw new Error('Templates data cannot be empty !');
        }

        // check templateIds for duplicates
        const duplicates = templateIds.filter((item, index) => templateIds.indexOf(item) !== index);
        if (duplicates.length > 0) {
            throw new Error(`Templates data contains duplicate template ids: ${duplicates.join(', ')}`);
        }

        if (isNullOrEmpty(metadata)) {
            throw new Error('Missing templates metadata !');
        }

        const validResult = validateTemplateMetadata(metadata);
        if (!validResult.success) {
            throw new AppError(`Templates metadata is not valid: ${validResult.error}`);
        }

        const metadataTemplateIds = Object.keys(metadata.templates);
        if (metadataTemplateIds.length === 0) {
            throw new Error('Templates metadata cannot be empty !');
        }

        // check if all templates in metadata are present in data
        const missingTemplates = metadataTemplateIds.filter(id => !templateIds.includes(id));
        if (missingTemplates.length > 0) {
            throw new Error(`Some templates defined in metadata does not have corresponding template file (*.hbs): ${missingTemplates.join(', ')}`);
        }

        // key - templateId, value - template metadata definition
        const definitions: Record<string, TemplateMetadataDefinition> = {};
        for (const templateId of metadataTemplateIds) {
            const templateMetadata = metadata.templates[templateId];
            if (!templateMetadata) {
                throw new Error(`Template metadata for '${templateId}' not found in metadata !`);
            }

            definitions[templateId] = {
                id: templateId,
                displayName: templateMetadata.displayName,
                description: templateMetadata.description,
                settings: {}
            };

            for (const group of templateMetadata.settings) {
                definitions[templateId].settings ??= {};

                // group name has alias, e.g. "CSharpWinForms:CSharp"
                // where "CSharpWinForms" is the group name points to "settings.CSharpWinForms" but for whole app it will be aliased as "CSharp" name.
                if (group.indexOf(':') > -1) {
                    const [groupName, alias] = group.split(':');
                    definitions[templateId].settings[alias] = metadata.settings[groupName] || [];
                } else {
                    definitions[templateId].settings[group] = metadata.settings[group] || [];
                }
            }
        }

        HbsTemplateManager._sources = data;
        HbsTemplateManager._metadata = metadata;
        HbsTemplateManager._definitions = definitions;

        HbsTemplateManager._initialized = true;
    }

    private static checkInitialized(): void {
        if (!HbsTemplateManager._initialized) {
            throw new Error('HbsTemplateManager is not initialized !');
        }
    }

    public static hasTemplate(templateId: string): boolean {
        HbsTemplateManager.checkInitialized();
        return HbsTemplateManager._sources.hasOwnProperty(templateId);
    }

    public static getTemplateDefinitions(): Record<string, TemplateMetadataDefinition> {
        HbsTemplateManager.checkInitialized();
        return HbsTemplateManager._definitions;
    }

    public static getTemplateDefinition(templateId: string): TemplateMetadataDefinition | undefined {
        HbsTemplateManager.checkInitialized();
        if (!HbsTemplateManager._definitions.hasOwnProperty(templateId)) {
            return undefined;
        }
        return HbsTemplateManager._definitions[templateId];
    }

    public static runTemplate(templateId: string, data: unknown): string {
        HbsTemplateManager.checkInitialized();
        let compiled: HandlebarsTemplateDelegate;

        HbsTemplateManager._compiled ??= {};
        if (!HbsTemplateManager._compiled.hasOwnProperty(templateId)) {
            if (!HbsTemplateManager._sources.hasOwnProperty(templateId)) {
                const allTemplates = Object.keys(HbsTemplateManager._sources).join(', ');

                throw new AppError(`Template with id '${templateId}' not found (available templates: ${allTemplates})!`);
            }

            const source = HbsTemplateManager._sources[templateId];
            compiled = Handlebars.compile(source, { knownHelpers: getKnownHelpers() });

            HbsTemplateManager._compiled[templateId] = compiled;
        } else {
            compiled = HbsTemplateManager._compiled[templateId];
        }

        const result = compiled(data, {
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true,
            allowCallsToHelperMissing: true
        });
        if (result.indexOf('¤') > -1) {
            // NOTE: special tag to remove one tab (decrease indent)
            return result.replace(/\t¤$/gm, '');
        }

        return result;
    }
}
/* eslint-enable no-prototype-builtins */