export type HbsMetadata = {
    templates: Array<{ id: string, name: string, type: 'root' | 'child' }>;
};

declare let HBS_METADATA: HbsMetadata;

/**
 *  Retrieves the Handlebars metadata of available hbs templates.
 */
export function getHbsMetadata(): HbsMetadata {
    if (typeof HBS_METADATA === 'undefined') {
        return { templates: [] };
    }

    return HBS_METADATA;
}