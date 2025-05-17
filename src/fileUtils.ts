import { isNullOrEmpty, tryRemoveBOM } from '.';
import type { FileInfo, ReadFileInfoOptions } from './types';
import { type PlatformPath } from 'node:path'; 

export type pathExistsCallback = (path: string) => Promise<boolean>;
export type readFileCallback = (path: string, options?: { encoding: BufferEncoding | null }) => Promise<string | Buffer>;

export async function safeReadFile(fileName: string, pathExists: pathExistsCallback, readFile: readFileCallback): Promise<string> {
    //if (!(await fse.pathExists(fileName))) {
    if (!(await pathExists(fileName))) {
        throw new Error(`File '${fileName}' not found.`);
    }

    // const content = await fse.readFile(fileName, { encoding: 'utf-8' });
    const content = await readFile(fileName, { encoding: 'utf-8' });
    return isNullOrEmpty(content) ? '' : tryRemoveBOM(content as string);
}

const formatRelativePath = (p: string): string => {
    const h = p.slice(0, 1);
    const res = h === '.' ? p : (h === '/' ? `.${p}` : `./${p}`);
    return res.replace('\\', '/');
};

export async function readFileInfo(inputPath: string, platformPath: PlatformPath, 
    pathExists: pathExistsCallback, readFile: readFileCallback,
    options?: ReadFileInfoOptions): Promise<FileInfo> {
    if (isNullOrEmpty(inputPath)) {
        throw new Error(`Parameter 'inputPath' could not be undefined or empty!`);
    }

    options = Object.assign<ReadFileInfoOptions, Partial<ReadFileInfoOptions>>({
        fileMustExist: false,
        rootFolder: undefined,
        formatRelative: false,
        loadContent: false,
        encoding: 'utf-8',
    }, options ?? {});

    let rootFolder: string | undefined = undefined;
    const hasRootFolder = options.rootFolder !== undefined && options.rootFolder !== null;
    if (hasRootFolder) {
        rootFolder = typeof options.rootFolder === 'string' ? options.rootFolder : options.rootFolder!.full;
    }

    const isAbsolute = platformPath.isAbsolute(inputPath);
    if (!isAbsolute && rootFolder === undefined) {
        throw new Error(`Parameter 'rootFolder' is required when 'inputPath' is relative!`);
    }

    const full = isAbsolute ? inputPath : platformPath.join(rootFolder!, inputPath);
    if (rootFolder && platformPath.relative(rootFolder, full).startsWith('../')) {
        throw new Error(`File '${inputPath}' is outside of root folder '${rootFolder}'!`);
    }

    let relative: string | undefined;
    if (hasRootFolder) {
        relative = isAbsolute ? platformPath.relative(rootFolder!, inputPath) : inputPath;
        relative = relative.replace(/\\/g, '/');
        if (options.formatRelative === true) {
            relative = formatRelativePath(relative);
        }

        if (relative.startsWith('../')) {
            throw new Error(`File '${inputPath}' is outside of root folder '${rootFolder}'!`);
        }
    }

    //const exist = fse.pathExistsSync(full);
    const exist = await pathExists(full);
    if (!exist && options.fileMustExist === true) {
        throw new Error(`File '${inputPath}' does not exist!`);
    }

    const basename = platformPath.basename(full);
    const dirname = platformPath.dirname(full);
    const ext = platformPath.extname(full);
    const extless = platformPath.basename(full, ext);

    let content: string | Buffer | undefined = undefined;
    if (options.loadContent === true) {
        const encoding = options.encoding ?? null;
        //content = await fse.readFile(full, { encoding: encoding });
        content = await readFile(full, { encoding: encoding });
        if (typeof content === 'string') {
            content = isNullOrEmpty(content) ? '' : tryRemoveBOM(content);
        }
    }

    return { full, relative: relative, exist, basename, dirname, ext: ext, extless: extless, content };
}