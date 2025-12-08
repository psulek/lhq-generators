import path from 'node:path';
import { glob } from 'glob';
import fse from 'fs-extra';

import { getGeneratedFileContent } from '../src/generatorUtils.js';
import { GeneratedFile, GenerateResult, LhqModel } from '../src/index.js';
import { Generator } from '../src/generator.js';
import { initGenerator, splitPath, verifyFile } from './testUtils.js';
import * as fileUtils from './fileUtils.js';

import { folders } from './testUtils.js';
import { findNamespaceForModel } from '../src/namespaceUtils.js';


setTimeout(async () => {
    await initGenerator();

    const testFolders = await glob('*/', { cwd: folders().templates, nodir: false });
    // const testFolders = ['NetCoreResxCsharp01'];

    describe('Generating code from LHQ models', () => {
        testFolders.forEach((folder) => {
            it(`generate code from folder '${folder}'`, async function () {
                await generateFromLhq(folder);
            });
        });

    });

    run();
}, 500);


async function generateFromLhq(folder: string): Promise<void> {
    const testDir = path.join(folders().templates, folder);

    const csProjectFiles = await glob('*.csproj', { cwd: testDir, nodir: true });
    if (csProjectFiles?.length === 0) {
        return;
    }

    const csProjectFileName = path.join(testDir, csProjectFiles[0]);
    //const csProjectContent = await safeReadFile(csProjectFile);
    const csProjectFile = await fileUtils.readFileInfo(csProjectFileName, { encoding: 'utf8', fileMustExist: true, loadContent: true });


    const lhqFileName = path.join(testDir, 'Strings.lhq');
    const lhqFile = await fileUtils.readFileInfo(lhqFileName, { encoding: 'utf8', fileMustExist: true, loadContent: true });

    const rootNamespace = findNamespaceForModel({ lhqModelFile: lhqFile, csProjectFiles: [csProjectFile] });
    //const rootNamespace = getRootNamespaceFromCsProj('Strings.lhq', 'Strings.lhq.tt', csProjectFile, csProjectContent)!;

    //const lhqFile = await safeReadFile(lhqFileName);
    const model = JSON.parse(lhqFile.content as string) as LhqModel;
    const namespace = rootNamespace?.namespaceDynamicExpression === true ? '' : rootNamespace!.namespace;
    const data = { namespace: namespace };
    const generator = new Generator();
    const _result = await generator.generate(lhqFileName, model, data);
    const result: GenerateResultForTest = {
        generatedFiles: _result.generatedFiles.map(f => ({
            fileName: splitPath(f.fileName),
            bom: f.bom,
            content: f.content,
            lineEndings: f.lineEndings
        }))
    };

    const generatedFolder = path.join(folders().snapshots, 'generated', folder);
    await fse.ensureDir(generatedFolder);

    await Promise.all(result.generatedFiles.map(async function (file) {
        await saveGenFile(file, generatedFolder);
        file.content = '';
    }));

    await verifyFile(path.join(generatedFolder, 'result.txt'), result, 'text');

    // const testResult: GenerateResultForTest = {
    //     generatedFiles: result.generatedFiles.map(f => ({
    //         fileName: splitPath(f.fileName),
    //         bom: f.bom,
    //         content: f.content,
    //         lineEndings: f.lineEndings
    //     }))
    // };

    // await verifyFile(path.join(generatedFolder, 'result.txt'), testResult, 'text');
}

type GeneratedFileForTest = Omit<GeneratedFile, 'fileName'> & { fileName: string[] };
type GenerateResultForTest = {
    generatedFiles: GeneratedFileForTest[];
}

async function saveGenFile(generatedFile: GeneratedFileForTest, outputPath?: string): Promise<void> {
    const content = getGeneratedFileContent(generatedFile as unknown as GeneratedFile, true);
    const bom = generatedFile.bom ? '\uFEFF' : '';
    const buffer = Buffer.from(bom + content, 'utf8');
    let fileName = generatedFile.fileName.join(path.sep);

    fileName = outputPath ? path.join(outputPath, fileName) : fileName;
    await verifyFile(fileName, buffer, 'text');
}