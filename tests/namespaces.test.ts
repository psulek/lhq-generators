import path from 'node:path';
import { expect } from 'chai';
import { glob } from 'glob';

import { getGeneratedFileContent } from '../src/generatorUtils.js';
import { CSharpNamespaceInfo, FileInfo } from '../src/types.js';
import * as fileUtils from './fileUtils.js';

import { safeReadFile, verify } from './testUtils.js';

import { folders } from './testUtils.js';
import { LhqModelLineEndings } from '../src/api/schemas.js';
import { GeneratedFile } from '../src/api/types.js';
import { findNamespaceForModel } from '../src/namespaceUtils.js';


setTimeout(async () => {

    const csProjectFiles = await glob('*.csproj', { cwd: folders().csproj, nodir: true });
    //const csProjectFiles = ['project10.csproj'];

    describe('Retrieving namespace information', () => {

        csProjectFiles.forEach((csProjectFile) => {
            const ident = csProjectFile.replace('.csproj', '');
            describe(`Namespaces ${ident}`, async function () {
                it(`retrieve namespace`, async function () {
                    // @ts-ignore
                    // const suite = this as Mocha.Suite;

                    const ns = await getNamespace(csProjectFile);
                    await verify('namespaces', ident, ns, 'text');
                });
            });
        });

        describe('Encodings', function () {
            async function testEncodings(endings: LhqModelLineEndings) {
                const encodingPath = path.join(folders().data, 'encodings');
                const testFilePath = path.join(encodingPath, `test_${endings.toLowerCase()}.txt`);
                let content = await safeReadFile(testFilePath);
                const generatedFile: GeneratedFile = { fileName: testFilePath, content, lineEndings: endings, bom: false };
                content = getGeneratedFileContent(generatedFile, true);

                const buffer = Buffer.from(content, 'utf8');

                await verify('encodings', `endings_${endings.toLowerCase()}`, buffer, 'binary');
            }

            it(`Encode with CRLF`, async function () {

                await testEncodings('CRLF');
            });

            it(`Encode with LF`, async function () {
                await testEncodings('LF');
            });
        });

        // describe('Manual tests', function () {
        //     it('Manual test 1', function () {

        //         const lhqModelFile = {
        //             "exist": true,
        //             "full": "C:\\dev\\github\\psulek\\lhqeditor\\src\\Gen.Lib.Tests\\bin\\Debug\\TestData\\WpfResxCsharp01\\Strings.lhq",
        //             "ext": ".lhq",
        //             "extless": "Strings",
        //             "relative": "Strings.lhq",
        //             "dirname": "C:\\dev\\github\\psulek\\lhqeditor\\src\\Gen.Lib.Tests\\bin\\Debug\\TestData\\WpfResxCsharp01",
        //             "basename": "Strings.lhq",
        //             "content": null
        //         } as unknown as FileInfo;

        //         const csprojs = [
        //             {
        //                 "exist": true,
        //                 "full": "C:\\dev\\github\\psulek\\lhqeditor\\src\\Gen.Lib.Tests\\bin\\Debug\\TestData\\WpfResxCsharp01\\WpfResxCsharp01.csproj",
        //                 "ext": ".csproj",
        //                 "extless": "WpfResxCsharp01",
        //                 "relative": "WpfResxCsharp01.csproj",
        //                 "dirname": "C:\\dev\\github\\psulek\\lhqeditor\\src\\Gen.Lib.Tests\\bin\\Debug\\TestData\\WpfResxCsharp01",
        //                 "basename": "WpfResxCsharp01.csproj",
        //                 "content": "<Project Sdk=\"Microsoft.NET.Sdk\">\r\n\r\n    <PropertyGroup>\r\n        <TargetFramework>net8.0</TargetFramework>\r\n        <ImplicitUsings>enable</ImplicitUsings>\r\n        <Nullable>enable</Nullable>\r\n        <RootNamespace>test.localization</RootNamespace>\r\n        <OutputType>Exe</OutputType>\r\n    </PropertyGroup>\r\n\r\n    <ItemGroup>\r\n        <None Update=\"Strings.lhq\">\r\n            <CopyToOutputDirectory>Always</CopyToOutputDirectory>\r\n        </None>\r\n        <None Update=\"Strings.lhq.tt\">\r\n            <CopyToOutputDirectory>Always</CopyToOutputDirectory>\r\n<!--            <CustomToolNamespace>mynamspace1</CustomToolNamespace>-->\r\n        </None>\r\n    </ItemGroup>\r\n\r\n    <ItemGroup>\r\n      <Folder Include=\"GenOutput\\\" />\r\n    </ItemGroup>\r\n\r\n</Project>\r\n"
        //             }
        //         ] as unknown as FileInfo[];

        //         const result = findNamespaceForModel({ lhqModelFile, csProjectFiles: csprojs });
        //         expect(result).to.not.be.undefined;
        //         expect(result!.namespace).to.equal('test.localization');

        //     });
        // });
    });

    run();

}, 500);


async function getNamespace(csProjectName: string): Promise<CSharpNamespaceInfo> {
    csProjectName = path.join(folders().csproj, csProjectName);
    const csProjFile = await fileUtils.readFileInfo(csProjectName, { rootFolder: folders().cwd, fileMustExist: true, formatRelative: true, loadContent: true });
    const lhqFile = await fileUtils.readFileInfo('Strings.lhq', { rootFolder: csProjFile.dirname });

    const rootNamespace = findNamespaceForModel({ lhqModelFile: lhqFile, csProjectFiles: [csProjFile] });

    expect(rootNamespace).to.not.be.undefined;

    // @ts-ignore
    (rootNamespace as any).csProjectFileName = csProjFile.relative!;
    return rootNamespace!;
}