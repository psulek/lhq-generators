import type { ZodError } from 'zod';
import * as zodToJsonSchema from 'zod-to-json-schema';
import { fromZodError, createMessageBuilder } from 'zod-validation-error';

import { type LhqModel, LhqModelSchema } from './api/schemas';
import { isNullOrEmpty, updateEOL, tryJsonParse } from './utils';
import type { LhqValidationResult } from './types';
import type { GeneratedFile } from './api/types';
import { type TemplateMetadataValidationResult, templatesMetadataSchema, type TemplatesMetadata } from './api/templates';
import { ModelVersions } from './model/modelConst';

declare let PKG_VERSION: string;

/**
 * Returns the version of the library.
 * @returns The version of the library.
 */
export function getLibraryVersion(): string {
    if (typeof PKG_VERSION === 'undefined') {
        return '0.0.0';
    }

    return PKG_VERSION;
}

export function getZodError(error: ZodError): string {
    const messageBuilder = createMessageBuilder({
        prefix: '',
        prefixSeparator: '',
        issueSeparator: '\n'
    });
    const err = fromZodError(error, { messageBuilder });
    return err.toString();
}

export function validateTemplateMetadata(data: TemplatesMetadata | string): TemplateMetadataValidationResult {
    if (typeof data === 'string') {
        const parseResult = tryJsonParse(data, true);

        if (!parseResult.success) {
            return { success: false, error: parseResult.error };
        }

        data = parseResult.data as TemplatesMetadata;
    }

    if (data === undefined || data === null || typeof data !== 'object') {
        return { success: false, error: 'Specified "data" must be an object!' };
    }

    const parseResult = templatesMetadataSchema.safeParse(data);
    const success = parseResult.success && !isNullOrEmpty(parseResult.data);

    let error: string | undefined = undefined;
    if (!parseResult.success) {
        error = getZodError(parseResult.error);
    }

    return { success, error, metadata: success ? parseResult.data : undefined };
}

/**
 * Validates the specified data (as JSON object or JSON as string) against the defined `LhqModel` schema.
 * @param data - The data (as JSON object or JSON as string) to validate.
 * @returns The validation result.
 */
export function validateLhqModel(data: LhqModel | string): LhqValidationResult {
    if (typeof data === 'string') {
        const parseResult = tryJsonParse(data, true);

        if (!parseResult.success) {
            return { success: false, error: parseResult.error };
        }

        data = parseResult.data as LhqModel;
    }

    if (data === undefined || data === null || typeof data !== 'object') {
        return { success: false, error: 'Specified "data" must be an object!' };
    }

    const parseResult = LhqModelSchema.safeParse(data);
    let success = parseResult.success && !isNullOrEmpty(parseResult.data);

    let error: string | undefined = undefined;
    if (!parseResult.success) {
        const messageBuilder = createMessageBuilder({
            prefix: '',
            prefixSeparator: '',
            issueSeparator: '\n'
        });
        const err = fromZodError(parseResult.error, { messageBuilder });
        error = err.toString();
    }

    const model = success ? parseResult.data : undefined;
    if (success && model && model.model && model.model.version > ModelVersions.model) {
        success = false;
        error = 'Model version is newer than the supported version.';
    }

    return { success, error, model };
}

/**
 * Returns the content of the generated file with the appropriate line endings.
 * 
 * @param generatedFile - The generated file.
 * @param applyLineEndings - A flag indicating whether to apply line endings to the content. Line endings are determined by the `lineEndings` property of the `GeneratedFile`.
 * @returns The content of the generated file with the appropriate line endings.
 */
export function getGeneratedFileContent(generatedFile: GeneratedFile, applyLineEndings: boolean): string {
    if (!applyLineEndings || generatedFile.content.length === 0) {
        return generatedFile.content;
    }

    return updateEOL(generatedFile.content, generatedFile.lineEndings);
}

/**
 * Generates the JSON schema (as string) for the `LhqModel` schema.
 * @returns The JSON schema as a string.
 */
export function generateLhqSchema(): string {
    const jsonSchema = zodToJsonSchema.zodToJsonSchema(LhqModelSchema, {
        name: 'LhqModel',
        $refStrategy: 'root'
    });

    return JSON.stringify(jsonSchema, null, 2);
}