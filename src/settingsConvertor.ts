import type { CodeGeneratorGroupSettings, CodeGeneratorValidateResult, ICodeGeneratorSettingsConvertor } from './api/modelTypes';
import type { LhqModelDataNode } from './api/schemas';
import type { TemplateMetadataGroupSettings } from './api/templates';
import { HbsTemplateManager } from './hbsManager';
import { isNullOrEmpty } from './utils';

export class CodeGeneratorSettingsConvertor implements ICodeGeneratorSettingsConvertor {
    public convertValueForProperty(value: unknown, property: TemplateMetadataGroupSettings): unknown {
        if (value === undefined || value === null) {
            return property.default;
        }

        const valueType = typeof value;
        switch (property.type) {
            case 'boolean':
                {
                    switch (valueType) {
                        case 'string':
                            if (value === 'true') {
                                return true;
                            } else if (value === 'false') {
                                return false;
                            }
                            break;
                        case 'boolean':
                            return value;
                        case 'number':
                            return value !== 0;
                        default:
                            return property.default;
                    }

                    break;
                }
            case 'string':
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                return valueType === 'string' ? value : String(value);
            case 'list':
                {
                    if (Array.isArray(property.values)) {
                        const found = property.values.find(pv => typeof pv.value === valueType && pv.value === value);
                        return found ? found.value : property.default;
                    }

                    return property.default;
                }
            case 'number':
                return valueType === 'number' ? value : Number(value);
            default:
                throw new Error(`Unsupported setting type!`);
        }
    }

    public nodeToSettings(templateId: string, node: LhqModelDataNode): CodeGeneratorGroupSettings {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (!node) {
            throw new Error(`Node cannot be null.`);
        }

        const definition = HbsTemplateManager.getTemplateDefinition(templateId);
        if (!definition) {
            throw new Error(`Template definition for '${templateId}' not found.`);
        }

        const result: CodeGeneratorGroupSettings = {};

        if (node && node.childs) {
            node.childs.forEach(child => {
                const groupName = child.name;
                if (!isNullOrEmpty(groupName) && child.attrs !== undefined) {
                    if (Object.prototype.hasOwnProperty.call(definition.settings, groupName)) {
                        const groupSettings = definition.settings[groupName].properties;
                        const settings: Record<string, unknown> = {};

                        groupSettings.forEach(gs => {
                            let value: unknown;
                            if (Object.prototype.hasOwnProperty.call(child.attrs, gs.name)) {
                                value = child.attrs![gs.name];
                            } else {
                                value = gs.default;
                            }

                            settings[gs.name] = this.convertValueForProperty(value, gs);
                        });

                        result[groupName] = settings;
                    }
                }
            });
        }

        return result;
    }

    public getPropertyValue(templateId: string, settings: CodeGeneratorGroupSettings, group: string, property: string): { value: unknown, isValid: boolean } | undefined {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (!settings) {
            throw new Error(`Settings cannot be null.`);
        }

        if (isNullOrEmpty(group)) {
            throw new Error('Group cannot be null or empty.');
        }

        if (isNullOrEmpty(property)) {
            throw new Error('Property cannot be null or empty.');
        }

        if (Object.prototype.hasOwnProperty.call(settings, group)) {
            const groupSettings = settings[group];
            if (groupSettings && typeof groupSettings === 'object' && Object.prototype.hasOwnProperty.call(groupSettings, property)) {
                const value = groupSettings[property];
                const error = this.validateSetting(templateId, group, property, value, false);
                return { value, isValid: isNullOrEmpty(error) };
            }
        }

        return undefined;
    }

    public setPropertyValue(templateId: string, settings: CodeGeneratorGroupSettings, group: string, property: string, value: unknown): boolean {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (!settings) {
            throw new Error(`Settings cannot be null.`);
        }

        if (isNullOrEmpty(group)) {
            throw new Error('Group cannot be null or empty.');
        }

        if (isNullOrEmpty(property)) {
            throw new Error('Property cannot be null or empty.');
        }

        const error = this.validateSetting(templateId, group, property, value, false);
        if (isNullOrEmpty(error)) {
            if (!Object.prototype.hasOwnProperty.call(settings, group)) {
                settings[group] = {};
            }

            const definition = HbsTemplateManager.getTemplateDefinition(templateId)!;

            if (Object.prototype.hasOwnProperty.call(definition.settings, group)) {
                const groupSettings = definition.settings[group].properties;
                if (Object.prototype.hasOwnProperty.call(groupSettings, property)) {
                    const propertyDef = groupSettings.find(x => x.name === property);
                    value = this.convertValueForProperty(value, propertyDef!);
                }
            }

            settings[group][property] = value;
            return true;
        }

        return false;
    }

    public validateSetting(templateId: string, group: string, property: string, value: unknown, throwErr?: boolean): string | undefined {
        throwErr = throwErr ?? true;

        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (isNullOrEmpty(group)) {
            throw new Error('Group cannot be null or empty.');
        }

        if (isNullOrEmpty(property)) {
            throw new Error('Property cannot be null or empty.');
        }

        const definition = HbsTemplateManager.getTemplateDefinition(templateId);
        if (!definition) {
            if (throwErr) {
                throw new Error(`Template definition for '${templateId}' not found.`);
            }
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(definition.settings, group)) {
            const propertyDef = definition.settings[group].properties.find(x => x.name === property);

            return this.validateProperty(group, propertyDef, value);
        }

        if (throwErr) {
            throw new Error(`Group '${group}' not found in template '${templateId}' settings.`);
        }

        return undefined;
    }

    public validateSettings(templateId: string, settings: CodeGeneratorGroupSettings): CodeGeneratorValidateResult {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (!settings) {
            throw new Error(`Settings cannot be null.`);
        }

        const definition = HbsTemplateManager.getTemplateDefinition(templateId);
        if (!definition) {
            throw new Error(`Template definition for '${templateId}' not found.`);
        }

        for (const [group, groupSettings] of Object.entries(settings)) {
            if (groupSettings && typeof groupSettings === 'object') {
                for (const [name, value] of Object.entries(groupSettings)) {
                    if (Object.prototype.hasOwnProperty.call(definition.settings, group)) {
                        const property = definition.settings[group].properties.find(x => x.name === name);
                        const valRes = this.validateProperty(group, property, value);
                        if (valRes && !isNullOrEmpty(valRes)) {
                            return { group, error: valRes, property: property!.name };
                        }
                    }
                }
            }
        }

        return { group: '', property: '', error: undefined };
    }

    private validateProperty(group: string, property: TemplateMetadataGroupSettings | undefined, value: unknown): string | undefined {
        if (property) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            if (isNullOrEmpty(value) || (property.type === 'string' && value.toString().trim() === '')) {
                return property.required ? `${group} / '${property.name}' value is required.` : undefined;
            }

            if (property.validators && property.validators.length > 0) {
                for (const validator of property.validators) {
                    const regex = new RegExp(validator.regex, validator.flags);
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    if (!regex.test(value.toString())) {
                        return validator.error;
                    }
                }
            }
        }

        return undefined;
    }

    public settingsToNode(templateId: string, settings: CodeGeneratorGroupSettings): LhqModelDataNode {
        if (isNullOrEmpty(templateId)) {
            throw new Error('Template id cannot be null or empty.');
        }

        if (!settings) {
            throw new Error(`Settings cannot be null.`);
        }

        const definition = HbsTemplateManager.getTemplateDefinition(templateId);
        if (!definition) {
            throw new Error(`Template definition for '${templateId}' not found.`);
        }

        const result: LhqModelDataNode = {
            name: 'Settings',
            childs: []
        };

        Object.keys(settings).forEach(groupName => {
            const groupSettings = settings[groupName];
            if (groupSettings && typeof groupSettings === 'object') {
                const groupNode: LhqModelDataNode = {
                    name: groupName,
                    attrs: {}
                };

                for (const [name, value] of Object.entries(groupSettings)) {
                    if (Object.prototype.hasOwnProperty.call(definition.settings, groupName)) {
                        const property = definition.settings[groupName].properties.find(x => x.name === name);
                        if (property) {
                            if (value === undefined || value === null) {
                                if (property.default !== undefined && property.default !== null) {
                                    groupNode.attrs![name] = property.default.toString();
                                }
                            } else {
                                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                                groupNode.attrs![name] = value.toString();
                            }
                        }
                    }
                }

                result.childs!.push(groupNode);
            }
        });

        return result;
    }
}