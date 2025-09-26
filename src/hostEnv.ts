import type { IHostEnvironment } from './types';

export class HostEnvironment implements IHostEnvironment {
    public debugLog(msg: string): void {
        console.log(msg);
    }

    public pathCombine(path1: string, path2: string): string {
        return `${path1 ?? ''}/` + (path2 ?? '');
    }
}