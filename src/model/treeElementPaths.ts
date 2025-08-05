import type { ITreeElement, ITreeElementPaths } from '../api/modelTypes';
import { isNullOrEmpty } from '../utils';

export class TreeElementPaths implements ITreeElementPaths {
    private paths: string[] = [];

    constructor(element: ITreeElement) {
        this.refresh(element)
    }

    public toJson(): string[] {
        return this.paths ?? [];
    }

    public refresh(element: ITreeElement): void {
        this.paths = [];
        if (element) {
            if (element.parent) {
                const parentPaths = element.parent.paths;

                if (parentPaths instanceof TreeElementPaths) {
                    this.paths = [...parentPaths.paths];
                }
            }

            this.paths.push(element.name);
        }
    }

    public static parse(path: string, separator: string): TreeElementPaths {
        if (isNullOrEmpty(path)) {
            throw new Error('Path cannot be null or empty');
        }
        if (isNullOrEmpty(separator)) {
            throw new Error('Separator cannot be null or empty');
        }
        const paths = path.split(separator);
        const treeElementPaths = new TreeElementPaths(undefined!);
        treeElementPaths.paths = paths.filter(x => !isNullOrEmpty(x));
        return treeElementPaths;
    }

    public getPaths = (includeRoot?: boolean): string[] => {
        if (includeRoot) {
            return [...this.paths];
        }
        return [...this.paths.slice(1)];
    }

    public clone(includeRoot?: boolean): ITreeElementPaths {
        const result = new TreeElementPaths(undefined!);
        result.paths = this.getPaths(includeRoot);
        return result;
    }

    public getParentPath = (separator: string, includeRoot?: boolean): string => {
        separator ??= '';
        includeRoot ??= false;

        let p = this.paths;
        if (!includeRoot && this.paths.length > 0) {
            p = this.paths.slice(1);
        }

        return separator + p.join(separator);
    }
}
