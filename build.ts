import path from 'node:path';
import { exec, spawn } from 'node:child_process';
import { glob } from 'glob';
import semver, { type ReleaseType } from 'semver';

import { build, type Options } from 'tsup';
//type TsupBuildOptions = Parameters<typeof build>[0];

import fse from 'fs-extra';
import type { IPackageJson } from 'package-json-type';
import pc from 'picocolors'

import { generateLhqSchema, validateTemplateMetadata } from './src/generatorUtils';
// import type { HbsMetadata } from './src/hbsMetadata';
//import type { TemplatesMetadata } from './src/api/templates';
// import {type TemplatesMetadata } from './src/api/templates';


const distFolder = path.join(__dirname, 'dist');
const sourcePackageFile = path.join(__dirname, 'package.json');

let packageJson: Mutable<IPackageJson>;

type EsBuildOptions = Parameters<NonNullable<Options['esbuildOptions']>>[0];

const compileOnly = process.argv.findIndex(arg => arg === '--compile') > -1;
const incVersion = process.argv.findIndex(arg => arg === '--version') > -1;

// const hbsMetadata: HbsMetadata = {
//     templates: []
// };

// let templatesMetadata: TemplatesMetadata | undefined;

void (async () => {
    try {
        await fse.ensureDir(distFolder);

        await readPackageJson();

        await readHbsMetadata();

        if (compileOnly) {
            await Promise.all([
                // buildLib('cjs'),
                // buildLib('esm')
                buildLib('browser'),
                buildLib('cjs'),
                buildLib('esm'),
                buildCli(),
                buildDts(),
            ]);
        } else {
            await runMochaTests();
            await preparePackageVersion();

            await Promise.all([
                buildLib('browser'),
                buildLib('cjs'),
                buildLib('esm'),
                buildCli(),
                buildDts(),
                copyPackageJson(),
                copyExtraFiles(),
                genLhqSchema()
            ]);
        }
    } catch (error) {
        console.error('Build failed: ', error, (error as Error).stack);
        process.exit(1);
    }
})();

function updateBuildOptions(opts: EsBuildOptions): void {
    opts.define = {
        'PKG_VERSION': `'${packageJson.version}'`,
        // 'HBS_METADATA': JSON.stringify(hbsMetadata)
        //'TEMPLATES_METADATA': JSON.stringify(templatesMetadata)
    };
}

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

async function readPackageJson() {
    packageJson = await fse.readJson(sourcePackageFile, { encoding: 'utf-8' }) as Mutable<IPackageJson>;
}

async function preparePackageVersion() {
    // const sourcePackageFile = path.join(__dirname, 'package.json');
    // packageJson = await fse.readJson(sourcePackageFile, { encoding: 'utf-8' }) as Mutable<IPackageJson>;

    if (incVersion) {
        // const args = 'version patch';
        // const { code } = await spawnAsync('pnpm', args.split(' '), { cwd: __dirname, detached: false }, true);
        // if (code !== 0) {
        //     throw new Error(`Failed to update package version (code: ${code})`);
        // }

        let release = 'prerelease';
        let identifier = 'rc';

        const currentVersion = packageJson.version ?? '1.0.0';
        const packageSemVer = new semver.SemVer(currentVersion);
        if (packageSemVer.prerelease && packageSemVer.prerelease.length === 2) {
            release = 'prerelease';
            identifier = packageSemVer.prerelease[0] as string;
        } else {
            release = 'patch';
            identifier = '';
        }

        const newVersion = semver.inc(currentVersion, release as ReleaseType, identifier);
        if (newVersion) {
            packageJson.version = newVersion;

            //await savePackageJson(pkg, packageJsonFile);
            await fse.writeJson(sourcePackageFile, packageJson, { encoding: 'utf-8', spaces: 2 });
        }


        console.log(newVersion);
    }


    console.log('Updated local version to ' + pc.blueBright(packageJson.version));
}

async function buildLib(type: 'browser' | 'cjs' | 'esm') {
    const isBrowser = type === 'browser';
    const isEsm = type === 'esm';

    const subdir = type === 'cjs' ? '' : type;
    let outfile = path.join('dist', subdir, 'index.' + (isEsm ? 'mjs' : 'js'));
    console.log(`Building library to ${pc.blueBright(outfile)} ...`);
    outfile = path.join(__dirname, outfile);

    const target = isBrowser ? 'es2015' : 'es2017';

    const buildUp = async (minify: boolean) => {
        await build({
            entry: ['src/index.ts'],
            outDir: '',
            format: isBrowser ? 'iife' : type,
            silent: true,
            globalName: isBrowser ? 'LhqGenerators' : undefined,
            target: target,
            minify: minify,
            splitting: isEsm ? false : undefined,
            platform: isBrowser ? 'browser' : 'node',
            sourcemap: false,
            dts: false,
            clean: false,
            tsconfig: isBrowser ? 'tsconfig.browser.json' : 'tsconfig.json',
            esbuildOptions(esOpts, _) {
                esOpts.target = target;
                esOpts.outfile = outfile;
                if (minify) {
                    const ext = path.extname(outfile);
                    const base = path.basename(outfile, ext);
                    esOpts.outfile = path.join(path.dirname(outfile), `${base}.min${ext}`);
                }
                updateBuildOptions(esOpts);
            },
        });
    }

    await buildUp(false);
    await buildUp(true);
}


async function buildDts() {
    let dtsFile = path.join('dist', 'index.d.ts');
    console.log(`Building dts to ${pc.blueBright(dtsFile)} ...`);

    dtsFile = path.join(__dirname, dtsFile);

    await build({
        entry: ['src/index.ts'],
        outDir: '',
        dts: true,
        clean: false,
        silent: true,
        tsconfig: 'tsconfig.dts.json',
        esbuildOptions(esOpts) {
            esOpts.outfile = dtsFile;
        }
    });

    await fse.move(dtsFile, path.join(__dirname, 'dist', 'types', 'index.d.ts'));
}

async function buildCli() {
    let outfile = path.join('dist', 'cli.js');
    console.log(`Building CLI to ${pc.blueBright(outfile)} ...`);
    outfile = path.join(__dirname, outfile);

    const bundle = false;
    const external = bundle ? ['path', 'fs', 'os'] : undefined;

    await build({
        entry: ['src/cli.ts'],
        outDir: '',
        format: 'cjs',
        silent: true,
        bundle: bundle,
        skipNodeModulesBundle: false,
        platform: 'node',
        external: external,
        minify: false,
        splitting: false,
        sourcemap: false,
        dts: false,
        clean: false,
        //tsconfig: 'tsconfig.build.json',
        esbuildOptions(esOpts) {
            esOpts.outfile = outfile;
            esOpts.platform = 'node';
            esOpts.external = external;
            updateBuildOptions(esOpts);
        },
    });
}

async function copyPackageJson() {
    const newPackageJson: Partial<IPackageJson> = {
        name: packageJson.name,
        version: packageJson.version,
        author: packageJson.author,
        description: packageJson.description,
        engines: packageJson.engines,
        dependencies: packageJson.dependencies,
        peerDependencies: {
            'typescript': packageJson.peerDependencies?.typescript ?? '^5.0.2',
        },
        types: 'types/index.d.ts',
        bin: {
            lhqcmd: 'cli.js'
        },
        main: './index.js',
        browser: './browser/index.js',
        module: './esm/index.mjs',
    }

    let targetPackageFile = path.join('dist', 'package.json');
    console.log('Copying package.json to ' + pc.blueBright(targetPackageFile));
    targetPackageFile = path.join(__dirname, targetPackageFile);
    await fse.writeJson(targetPackageFile, newPackageJson, { encoding: 'utf-8', spaces: 2 });
}

async function copyExtraFiles() {
    // hbs
    let targetHbsDir = path.join('dist', 'hbs');
    console.log('Copying hbs templates to ' + pc.blueBright(targetHbsDir));
    targetHbsDir = path.join(__dirname, targetHbsDir);
    await fse.copy(path.join(__dirname, 'hbs'), targetHbsDir);

    // copy LICENSE files
    const mdFiles = await glob('{*.md,LICENSE}', { cwd: __dirname, nodir: true });
    console.log(`Copying ${mdFiles.length} MD files to ` + pc.blueBright('dist'));

    await Promise.all(mdFiles.map(async (file) => {
        const srcFile = path.join(__dirname, file);
        const targetFile = path.join(__dirname, 'dist', file);
        await fse.copy(srcFile, targetFile);
    }));


}

async function genLhqSchema() {
    const schenameFileName = 'lhq-schema.json';
    console.log('Generating lhq model schema to ' + pc.blueBright(schenameFileName));

    const lhqSchemaFile = path.join(__dirname, 'dist', schenameFileName);
    const schemaJson = generateLhqSchema();
    await fse.writeFile(lhqSchemaFile, schemaJson);
    //await fse.copy(lhqSchemaFile, path.join(__dirname, schenameFileName));
}

export async function runMochaTests(): Promise<void> {
    const cwd = __dirname;
    const bin = 'mocha/bin/mocha.js';
    const mocha = path.join(cwd, 'node_modules', bin);
    const testFile = './tests/index.spec.ts';

    const colorArg = (process.env.MOCHA_COLORS === '0') ? '--no-colors' : '--colors';

    const args = [mocha, '--delay', '-n tsx', '--enable-source-maps', colorArg, testFile];

    console.log(`Running mocha tests... [${colorArg}]`);
    const { code, stdout, stderr } = await spawnAsync('node', args, { cwd, detached: false }, true);
    if (code !== 0) {
        throw new Error(`Some mocha tests failed (path '${cwd}')\n (code: ${code}) ${stdout || ''} ${stderr || ''}`);
    }

    const res = stdout.trim();
    if (res?.length > 0) {
        console.log(res);
    }
}

export type SpawnResult = { code: number, stdout: string, stderr: string, takes: number };

export type SpawnOptions = {
    cwd: string;
    detached: boolean;
    shell?: boolean;
    env?: NodeJS.ProcessEnv | undefined;
};


export function spawnAsync(command: string, args: string[], options: SpawnOptions, logToConsole: boolean = true, throwOnError: boolean = false): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
        let stderr = '';
        let stdout = '';
        const start = Date.now();

        if (logToConsole === undefined) {
            logToConsole = true;
        }

        if (throwOnError === undefined) {
            throwOnError = true;
        }


        const ls = spawn(command, args, options || {});
        ls.stdout.on('data', (data) => {
            const str = String(data);
            stdout += str;

            if (logToConsole) {
                console.log(str); // Updated to use 'str' instead of 'data.toString()'
            }
        });

        ls.stderr.on('data', function (data) {
            const str = String(data);
            stderr += str;

            if (logToConsole && !throwOnError) {
                console.log(str); // Updated to use 'str' instead of 'data.toString()'
            }
        });

        ls.on('exit', function (code) {
            const takes = Date.now() - start;

            if (code !== 0 && throwOnError) {
                return reject(new Error(`Command failed with exit code ${code}:\n${stdout}\n${stderr}`));
            }

            return resolve({ code: code ?? 0, stdout: stdout, stderr: stderr, takes: takes });
        });

        ls.on('error', err => {
            if (logToConsole) {
                console.error(err);
            }
            return reject(err);
        })
    });
}

async function readHbsMetadata() {
    const metadataFile = path.join(__dirname, 'hbs', 'metadata.json');
    const metadataContent = await fse.readFile(metadataFile, { encoding: 'utf-8' });
    const result = validateTemplateMetadata(metadataContent);
    if (!result.success) {
        throw new Error(`Validation of ${metadataFile} failed: ${result.error}`);
    }

    // templatesMetadata = result.metadata;

    //templatesMetadata;

    // const hbsFiles = await glob('*.hbs', { cwd: path.join(__dirname, 'hbs'), nodir: true });

    // // regex match for string: {{! template-id: NetCoreResxCsharp01 }}, result text is eg: NetCoreResxCsharp01
    // const templateIdRegex = /{{!\s*template-id:\s*([a-zA-Z0-9_-]+)\s*}}/;
    
    // // regex match for string: {{! template-name: Description }}, result text is eg: Description
    // const templateNameRegex = /{{!\s*template-name:\s*([\s\S]+?)\s*}}/;

    // // regex match for string: {{! template-type: child }}, result text is eg: child
    // const templateTypeRegex = /{{!\s*template-type:\s*([a-zA-Z0-9_-]+)\s*}}/;

    // await Promise.all(hbsFiles.map(async (file) => {
    //     const filePath = path.join(__dirname, 'hbs', file);
    //     const content = await fse.readFile(filePath, { encoding: 'utf-8' });
    //     const matchId = content.match(templateIdRegex);
    //     const templateId = matchId ? matchId[1] : undefined;

    //     const matchName = content.match(templateNameRegex);
    //     const templateName = matchName ? matchName[1] : undefined;

    //     if (!templateId || !templateName) {
    //         throw new Error(`Template file ${file} is missing template-id or template-name comment.`);
    //     }

    //     const matchType = content.match(templateTypeRegex);
    //     const type = matchType ? matchType[1] : 'root';
    //     if (type !== 'root' && type !== 'child') {
    //         throw new Error(`Template file ${file} has invalid template-type: ${type}. Expected 'root' or 'child'.`);
    //     }

    //     hbsMetadata.templates.push({ id: templateId, name: templateName, type: type});
    // }));
}
