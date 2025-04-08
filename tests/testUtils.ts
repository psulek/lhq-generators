import path from 'node:path';

import fs from 'node:fs/promises';
import fse from 'fs-extra';
import { expect, use } from 'chai';
import chaiBytes from 'chai-bytes';

use(chaiBytes);

import { isNullOrEmpty, tryJsonParse, tryRemoveBOM } from '../src/utils.js';

export type TestFolders = {
    cwd: string;
    hbs: string;
    snapshots: string;
    csproj: string;
    data: string;
    templates: string;
}

export type FilePath = {
    full: string;
    relative?: string;
    exist?: boolean;
}

let _folders: TestFolders | undefined;

export function folders(): TestFolders {
    if (!_folders) {
        const dir = __dirname;
        const hbs = path.resolve(dir, '..', 'hbs');
        const dirData = path.join(dir, 'data');
        const dirCsProj = path.join(dirData, 'csprojs');
        const dirTemplates = path.join(dirData, 'templates');

        _folders = Object.freeze({
            cwd: dir,
            hbs: hbs,
            snapshots: path.join(dir, 'snapshots'),
            csproj: dirCsProj,
            data: dirData,
            templates: dirTemplates
        });
    }
    return _folders;
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function safeReadFile(fileName: string): Promise<string> {
    if (!(await fse.pathExists(fileName))) {
        throw new Error(`File '${fileName}' not found.`);
    }

    const content = await fse.readFile(fileName, { encoding: 'utf-8' });
    return isNullOrEmpty(content) ? '' : tryRemoveBOM(content);
}

export async function verifyFile(fileName: string, value: string | Buffer | Record<string, unknown>): Promise<void> {
    const isBuffer = Buffer.isBuffer(value);
    const isObject = typeof value === 'object' && !isNullOrEmpty(value) && !isBuffer;
    const isString = typeof value === 'string';
    const buffer = isBuffer ? value : (isString ? Buffer.from(value, 'utf-8') : Buffer.from(JSON.stringify(value, null, 2), 'utf-8'));

    const targetDir = path.dirname(fileName);
    const ext = path.extname(fileName);
    const baseFileName = path.basename(fileName, ext);
    const verifiedFileName = path.join(targetDir, `${baseFileName}.verified${ext}`);
    const receivedFileName = path.join(targetDir, `${baseFileName}.received${ext}`);

    const writeSnapshot = async (verified?: boolean) => {
        await fs.writeFile((verified ?? false) ? verifiedFileName : receivedFileName, buffer);
    }

    await fse.ensureDir(targetDir);

    if (await fse.pathExists(receivedFileName)) {
        await fse.remove(receivedFileName);
    }

    if (await fse.pathExists(verifiedFileName)) {
        const snapshot = await fse.readFile(verifiedFileName, { encoding: null });

        try {
            expect(buffer).to.equalBytes(snapshot);
        }
        catch (e) {
            await writeSnapshot();

            if (e.name === 'AssertionError') {

                const compareLineEndings = () => {
                    const buffer_lf = buffer.reduce((count, byte) => byte === 10 ? count + 1 : count, 0);
                    const buffer_cr = buffer.reduce((count, byte) => byte === 13 ? count + 1 : count, 0);
                    const snapshot_lf = snapshot.reduce((count, byte) => byte === 10 ? count + 1 : count, 0);
                    const snapshot_cr = snapshot.reduce((count, byte) => byte === 13 ? count + 1 : count, 0);
    
                    expect(buffer_lf).to.equal(snapshot_lf, `Count of LF chars do not match!`);
                    expect(buffer_cr).to.equal(snapshot_cr, `Count of CR chars do not match!`);    
                }

                let compareLE = false;
                
                const str = snapshot.toString('utf-8');
                if (isString) {
                    expect(value).to.equal(str);
                    compareLE = true;
                } else if (isObject) {
                    const parsed = tryJsonParse(str, true);
                    let compareAsString = !parsed.success;
                    if (parsed.success) {
                        expect(value).to.deep.eq(JSON.parse(str));
                        compareAsString = true;
                    }
                    
                    if (compareAsString) {
                        expect(JSON.stringify(value, null, 2)).to.equal(str);
                        compareLE = true;
                    }
                } else {
                    throw e;
                }

                if (compareLE) {
                    compareLineEndings();
                }
            }
        }
    } else {
        await writeSnapshot(true);
        throw new Error(`New snapshot file '${verifiedFileName}' created. Please run the test again.`);
    }
}

export async function verify(/* suite: Mocha.Suite */ snapshotFolder: string, ident: string, value: string | Buffer | Record<string, unknown>): Promise<void> {
    const dir = path.join(folders().snapshots, snapshotFolder);
    //await fse.ensureDir(dir);
    const binary = Buffer.isBuffer(value);
    const snapshotFile = path.join(dir, `${ident}.${binary ? 'bin' : 'txt'}`);

    await verifyFile(snapshotFile, value);
}


export function createFilePath(filePath: string, rootFolderOrFilePath: string | FilePath, fileMustExist: boolean, formatRelative: boolean = true): FilePath {
    if (isNullOrEmpty(filePath)) {
        throw new Error(`Parameter 'inputPath' could not be undefined or empty!`);
    }

    const rootFolder = typeof rootFolderOrFilePath === 'string' ? rootFolderOrFilePath : rootFolderOrFilePath.full;
    const isAbsolute = path.isAbsolute(filePath);
    const full = isAbsolute ? filePath : path.join(rootFolder, filePath);
    if (path.relative(rootFolder, full).startsWith('../')) {
        throw new Error(`File '${filePath}' is outside of root folder '${rootFolder}'!`);
    }

    let relative = isAbsolute ? path.relative(rootFolder, filePath) : filePath;
    //relative = relative.replace('\\', '/');
    relative = relative.replace(/\\/g, '/');
    if (formatRelative) {
        relative = formatRelativePath(relative);
    }

    if (relative.startsWith('../')) {
        throw new Error(`File '${filePath}' is outside of root folder '${rootFolder}'!`);
    }

    const exist = fse.pathExistsSync(full);
    if (!exist && fileMustExist) {
        throw new Error(`File '${filePath}' does not exist!`);
    }

    return { full, relative: relative, exist };
}

export const formatRelativePath = (p: string): string => {
    const h = p.slice(0, 1);
    const res = h === '.' ? p : (h === '/' ? `.${p}` : `./${p}`);
    return res.replace('\\', '/');
};
