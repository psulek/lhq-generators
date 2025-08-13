import type { LhqModelLineEndings } from '../api/schemas';
import type { CodeGeneratorBasicSettings, ModelVersionsType } from '../api/modelTypes';

export const ModelVersions: ModelVersionsType = Object.freeze<ModelVersionsType>({
    model: 3,
    codeGenerator: 1
})

export const DefaultLineEndings: LhqModelLineEndings = 'LF';

export const DefaultCodeGenSettings: CodeGeneratorBasicSettings = {
    OutputFolder: 'Resources',
    EncodingWithBOM: false,
    LineEndings: DefaultLineEndings,
    Enabled: true
};

export const ResourceValueValidations = {
    nonBreakingSpace: /[\u00A0\u202F\uFEFF\u2007\u2060]/gm, // all "no-break" style spaces

    // x7F -  Delete control
    // \u2000-\u200F -  Various spaces & zero-width marks
    // \u2060-\u206F -  Invisible formatting controls
    noSupportedChars: /[\x7F\u2000-\u200F\u202A-\u202F\u2060-\u206F]/gm
}
