import { z } from 'zod';

export const templateMetadataSettingTypeSchema = z.union([
    z.literal('boolean'), z.literal('string'), z.literal('list'), z.literal('number')
]);

export const templateMetadataSettingValidatorSchema = z.object({
    /**
    * Regular expression for validating the setting value (for type 'string').
    */
    regex: z.string(),
    /**
     * Error message if validation fails.
     */
    error: z.string()
});

/**
 * Represents a single setting option for a generator (CSharp, ResX, Typescript, Json).
 */
export const templateMetadataGroupSettingsSchema = z.object({
    /**
     * Name of the setting.
     */
    name: z.string(),
    /**
     * Display name for UI.
     */
    displayName: z.string().optional(),
    /**
     * Description of the setting.
     */
    description: z.string(),
    /**
     * Type of the setting value (boolean, string, list).
     */
    type: templateMetadataSettingTypeSchema,
    /**
     * Default value for the setting.
     */
    default: z.union([z.boolean(), z.string(), z.number()]).nullable(),
    /**
     * Indicates if the setting is required. Default is true.
     */
    required: z.boolean().optional().default(true),
    /**
     * Regular expression for validating the setting value (for type 'string').
     */
    validators: z.array(templateMetadataSettingValidatorSchema).optional(),
    /**
     * List of possible values (for type 'list').
     */
    values: z.array(z.object({
        name: z.string(),
        value: z.string()
    })).optional()
});

export const templateMetadataGroupSchema = z.object({
    /**
     * Display name of the template.
     */
    displayName: z.string(),
    /**
     * Description of the template.
     */
    description: z.string(),
    /**
     * List of settings groups used by this template.
     */
    properties: z.array(templateMetadataGroupSettingsSchema)
});

export const templateMetadataSchema = z.object({
    /**
     * Display name of the template.
     */
    displayName: z.string(),
    /**
     * Description of the template.
     */
    description: z.string(),
    /**
     * List of settings groups used by this template.
     */
    settings: z.array(z.string())
});

/**
 * Generator templates metadata structure containing settings and available templates.
 */
export const templatesMetadataSchema = z.object({
    settings: z.record(templateMetadataGroupSchema),
    templates: z.record(templateMetadataSchema)
});

export const templateMetadataDefinitionSchema = templateMetadataSchema
    .omit({ settings: true })
    .extend({
        id: z.string(),
        settings: z.record(templateMetadataGroupSchema)
    });


// intered types

export type TemplateMetadataGroupSettings = z.infer<typeof templateMetadataGroupSettingsSchema>;

export type TemplateMetadataGroup = z.infer<typeof templateMetadataGroupSchema>;

export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

export type TemplatesMetadata = z.infer<typeof templatesMetadataSchema>;

export type TemplateMetadataValidationResult = {
    success: boolean, error: string | undefined, metadata?: TemplatesMetadata;
}

export type TemplateMetadataSettingType = z.infer<typeof templateMetadataSettingTypeSchema>;

export type TemplateMetadataDefinition = z.infer<typeof templateMetadataDefinitionSchema>;

export type TemplateMetadataSettingValidator = z.infer<typeof templateMetadataSettingValidatorSchema>;