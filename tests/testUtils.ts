import path from 'node:path';

import fs from 'node:fs/promises';
import fse from 'fs-extra';
import { expect, use } from 'chai';
import chaiBytes from 'chai-bytes';

use(chaiBytes);

import { isNullOrEmpty, tryJsonParse, tryRemoveBOM } from '../src/utils.js';
import { validateTemplateMetadata } from '../src/generatorUtils.js';
import { glob } from 'glob';
import { Generator } from '../src/generator.js';
import { GeneratorInitialization } from '../src/types.js';
import { HostEnvironment } from '../src/index.js';
//import { FilePath } from '../src/types.js';

export type TestFolders = {
    cwd: string;
    hbs: string;
    snapshots: string;
    csproj: string;
    data: string;
    templates: string;
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

/**
 * Splits a file path into an array of directory names using the platform-specific separator.
 * @param filePath The file path to split.
 * @returns Array of directory names.
 */
export function splitPath(filePath: string): string[] {
  return filePath.split(/[\\/]/).filter(Boolean);
}

export type FileVerifyType = 'text' | 'binary' | 'json';


export async function verifyFile(fileName: string, value: string | Buffer | Record<string, unknown>,
    expectFileType: FileVerifyType): Promise<void> {
    const isBuffer = Buffer.isBuffer(value);
    let isObject = typeof value === 'object' && !isNullOrEmpty(value) && !isBuffer;
    let isString = typeof value === 'string';
    const buffer = isBuffer ? value : (isString ? Buffer.from(value as string, 'utf-8') : Buffer.from(JSON.stringify(value, null, 2), 'utf-8'));

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

            if ((e as Error).name === 'AssertionError') {

                const compareLineEndings = () => {
                    const buffer_lf = buffer.reduce((count, byte) => byte === 10 ? count + 1 : count, 0);
                    const buffer_cr = buffer.reduce((count, byte) => byte === 13 ? count + 1 : count, 0);
                    const snapshot_lf = snapshot.reduce((count, byte) => byte === 10 ? count + 1 : count, 0);
                    const snapshot_cr = snapshot.reduce((count, byte) => byte === 13 ? count + 1 : count, 0);

                    expect(buffer_lf).to.equal(snapshot_lf, `Count of LF chars do not match!`);
                    expect(buffer_cr).to.equal(snapshot_cr, `Count of CR chars do not match!`);
                }

                let compareLE = false;

                let value2 = value;
                if (expectFileType !== 'binary' && isBuffer) {
                    isString = expectFileType === 'text';
                    isObject = expectFileType === 'json';
                    value2 = isString ? value.toString('utf-8') : JSON.parse(value.toString('utf-8'));
                }

                const str = snapshot.toString('utf-8');
                if (isString) {
                    expect(value2).to.equal(str);
                    compareLE = true;
                } else if (isObject) {
                    const parsed = tryJsonParse(str, true);
                    let compareAsString = !parsed.success;
                    if (parsed.success) {
                        expect(value2).to.deep.eq(JSON.parse(str));
                        compareAsString = true;
                    }

                    if (compareAsString) {
                        expect(JSON.stringify(value2, null, 2)).to.equal(str);
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

export async function verify(snapshotFolder: string, ident: string, value: string | Buffer | Record<string, unknown>,
    expectFileType: FileVerifyType, fileExt?: string): Promise<void> {
    const dir = path.join(folders().snapshots, snapshotFolder);
    //await fse.ensureDir(dir);
    const binary = Buffer.isBuffer(value);
    fileExt = fileExt ?? (binary ? 'bin' : 'txt');
    const snapshotFile = path.join(dir, `${ident}.${fileExt}`);
    await verifyFile(snapshotFile, value, expectFileType);
}

export const formatRelativePath = (p: string): string => {
    const h = p.slice(0, 1);
    const res = h === '.' ? p : (h === '/' ? `.${p}` : `./${p}`);
    return res.replace('\\', '/');
};


export async function initGenerator() {
    try {
        const hbsTemplatesDir = folders().hbs;

        const metadataFile = path.join(hbsTemplatesDir, 'metadata.json');
        const metadataContent = await fse.readFile(metadataFile, { encoding: 'utf-8' });
        const result = validateTemplateMetadata(metadataContent);
        if (!result.success) {
            throw new Error(`Validation of ${metadataFile} failed: ${result.error}`);
        }

        const generatorInit: GeneratorInitialization = {
            hbsTemplates: {},
            templatesMetadata: result.metadata!,
            hostEnvironment: new HostEnvironmentCli()
        };


        const hbsFiles = await glob('*.hbs', { cwd: hbsTemplatesDir, nodir: true });

        const templateLoaders = hbsFiles.map(async (hbsFile) => {
            const templateId = path.basename(hbsFile, path.extname(hbsFile));
            const fullFilePath = path.join(hbsTemplatesDir, hbsFile);
            generatorInit.hbsTemplates[templateId] = await safeReadFile(fullFilePath);
        });

        await Promise.all(templateLoaders);

        Generator.initialize(generatorInit);
    } catch (error) {
        console.error('Error initializing generator:', error);
        process.exit(1);
    }
}

class HostEnvironmentCli extends HostEnvironment {
    public pathCombine(path1: string, path2: string): string {
        return path.join(path1, path2);
    }
}