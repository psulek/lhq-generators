// import type { TemplateMetadata, TemplateMetadataSettings, TemplatesMetadata } from './api/templates';

// declare let TEMPLATES_METADATA: TemplatesMetadata;

// type TemplateInfo = TemplateMetadata & { id: string; }
// type TemplateSettings = {
//     [group: string]: TemplateMetadataSettings[];
// }

// export class TemplatesProvider {
//     private static metadata: TemplatesMetadata = TEMPLATES_METADATA;

//     public static getMetadata(): TemplatesMetadata {
//         if (!TemplatesProvider.metadata) {
//             throw new Error('Templates metadata is not available.');
//         }
//         return TemplatesProvider.metadata;
//     }

//     public static getTemplates(): Array<TemplateInfo> {
//         const result: Array<TemplateInfo> = [];

//         for (const [id, template] of Object.entries(TemplatesProvider.metadata.templates)) {
//             result.push({
//                 ...template,
//                 id,
//             });
//         }

//         return result;
//     }

//     public static getTemplateSettings(templateId: string): TemplateSettings {
//         const template = TemplatesProvider.metadata.templates[templateId];
//         if (!template) {
//             throw new Error(`Template with id "${templateId}" not found.`);
//         }

//         const settings: TemplateSettings = {};
//         for (const group of template.settings) {
//             settings[group] = TemplatesProvider.metadata.settings[group] || [];
//         }

//         return settings;
//     }
// }


// export type HbsMetadata = {
//     templates: Array<{ id: string, name: string, type: 'root' | 'child' }>;
// };

// declare let HBS_METADATA: HbsMetadata;

// /**
//  *  Retrieves the Handlebars metadata of available hbs templates.
//  */
// export function getHbsMetadata(): HbsMetadata {
//     if (typeof HBS_METADATA === 'undefined') {
//         return { templates: [] };
//     }

//     return HBS_METADATA;
// }
