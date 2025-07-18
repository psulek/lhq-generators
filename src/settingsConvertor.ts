import type { CodeGeneratorGroupSettings, CodeGeneratorValidateResult, ICodeGeneratorSettingsConvertor } from './api/modelTypes';
import type { LhqModelDataNode } from './api/schemas';
import type { TemplateMetadataSettings } from './api/templates';
import { HbsTemplateManager } from './hbsManager';
import { isNullOrEmpty } from './utils';

export class CodeGeneratorSettingsConvertor implements ICodeGeneratorSettingsConvertor {
    public convertValueForProperty(value: unknown, property: TemplateMetadataSettings): unknown {
        if (value === undefined || value === null) {
            return property.default;
        }

        const valueType = typeof value;
        switch (property.type) {
            case 'boolean':
                {
                    //return valueType === 'string' ? (value === 'true') : value;
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
                        const groupSettings = definition.settings[groupName];
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
                        const property = definition.settings[group].find(x => x.name === name);
                        if (property) {
                            // eslint-disable-next-line @typescript-eslint/no-base-to-string
                            if (isNullOrEmpty(value) || (property.type === 'string' && value.toString().trim() === '')) {
                                if (property.required) {
                                    const error = `${group} / '${property.name}' value is required.`;
                                    return { group, error, property: property.name };
                                }
                                continue;
                            }

                            if (property.validators && property.validators.length > 0) {
                                for (const validator of property.validators) {
                                    const regex = new RegExp(validator.regex);
                                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                                    if (!regex.test(value.toString())) {
                                        return { group, error: validator.error, property: property.name };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return { group: '', property: '', error: undefined };
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
                        const property = definition.settings[groupName].find(x => x.name === name);
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