import path from 'node:path';
import { glob } from 'glob';
import fse from 'fs-extra';

import { getGeneratedFileContent } from '../src/generatorUtils.js';
import { GeneratedFile, LhqModel } from '../src/index.js';
import { Generator } from '../src/generator.js';
import { initGenerator, verifyFile } from './testUtils.js';
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
    const result = await generator.generate(lhqFileName, model, data);

    const generatedFolder = path.join(folders().snapshots, 'generated', folder);
    await fse.ensureDir(generatedFolder);

    await Promise.all(result.generatedFiles.map(async function (file) {
        await saveGenFile(file, generatedFolder);
        file.content = '';
    }));

    await verifyFile(path.join(generatedFolder, 'result.txt'), result, 'text');
}

async function saveGenFile(generatedFile: GeneratedFile, outputPath?: string): Promise<void> {
    const content = getGeneratedFileContent(generatedFile, true);
    const bom = generatedFile.bom ? '\uFEFF' : '';
    const buffer = Buffer.from(bom + content, 'utf8');

    const fileName = !outputPath ? generatedFile.fileName : path.join(outputPath, generatedFile.fileName);
    await verifyFile(fileName, buffer, 'text');
}


// async function initGenerator() {
//     try {
//         const hbsTemplatesDir = folders().hbs;

//         const metadataFile = path.join(hbsTemplatesDir, 'metadata.json');
//         const metadataContent = await fse.readFile(metadataFile, { encoding: 'utf-8' });
//         const result = validateTemplateMetadata(metadataContent);
//         if (!result.success) {
//             throw new Error(`Validation of ${metadataFile} failed: ${result.error}`);
//         }

//         const generatorInit: GeneratorInitialization = {
//             hbsTemplates: {},
//             templatesMetadata: result.metadata!,
//             hostEnvironment: new HostEnvironmentCli()
//         };


//         const hbsFiles = await glob('*.hbs', { cwd: hbsTemplatesDir, nodir: true });

//         const templateLoaders = hbsFiles.map(async (hbsFile) => {
//             const templateId = path.basename(hbsFile, path.extname(hbsFile));
//             const fullFilePath = path.join(hbsTemplatesDir, hbsFile);
//             generatorInit.hbsTemplates[templateId] = await safeReadFile(fullFilePath);
//         });

//         await Promise.all(templateLoaders);

//         Generator.initialize(generatorInit);
//     } catch (error) {
//         console.error('Error initializing generator:', error);
//     }
// }

// class HostEnvironmentCli extends HostEnvironment {
//     public pathCombine(path1: string, path2: string): string {
//         return path.join(path1, path2);
//     }
// }