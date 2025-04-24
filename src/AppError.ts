export class AppError extends Error {
    public name = 'AppError';

    constructor(public message: string, stack?: string, public invalidModelSchema: boolean = false) {
        super(message);

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }

        if (stack !== undefined && stack !== null) {
            this.stack = stack;
        }
    }
}