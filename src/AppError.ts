export const AppErrorKinds = Object.freeze({
    invalidModelSchema: 'invalidModelSchema',
    templateValidationError: 'templateValidationError',
});

export class AppError extends Error {
    public name = 'AppError';

    constructor(public message: string, stack?: string, public kind: string = '', public code: string = '') {
        super(message);

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }

        if (stack !== undefined && stack !== null) {
            this.stack = stack;
        }
    }

    public toString(): string {
        return `${this.name} [${this.kind}/${this.code}]: ${this.message}`;
    }
}