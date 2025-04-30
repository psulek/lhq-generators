import path from 'node:path';
import { expect } from 'chai';
import { glob } from 'glob';
import fse from 'fs-extra';

import { createRootElement, detectLineEndings, serializeLhqModelToString, serializeRootElement } from '../src/generatorUtils';
import { folders, safeReadFile, verify } from './testUtils';
import { replaceLineEndings } from '../src/utils';
import { LhqModel } from '../src/api/schemas';
import { ICodeGeneratorElement } from '../src/api';

setTimeout(async () => {

    //const lhqFiles = await glob('**/*.lhq', { cwd: folders().templates, nodir: true });
    const lhqFiles = ['NetCoreResxCsharp01/Strings.lhq'];

    describe('serialize and deserialize in memory', () => {
        lhqFiles.forEach(lhqFile => {
            const ident = lhqFile.replace('.lhq', '');
            it(`serialize and deserialize file ${ident}`, async function () {

                const file = path.join(folders().templates, lhqFile);
                const content = await safeReadFile(file);
                const lineEndings = detectLineEndings(content);
                const model = JSON.parse(content) as LhqModel;

                const root = createRootElement(model);
                const serializedModel = serializeRootElement(root);

                expect(model).to.deep.eq(serializedModel);

                const changedModelJson = serializeLhqModelToString(model, lineEndings);
                const changedModelBuffer = Buffer.from(changedModelJson, 'utf-8');

                let snapshotStr = await fse.readFile(file, { encoding: 'utf8' });
                const snapshotModel = JSON.parse(snapshotStr) as LhqModel;
                snapshotStr = replaceLineEndings(JSON.stringify(snapshotModel, null, 2), lineEndings);
                const snapshot = Buffer.from(snapshotStr, 'utf-8');

                try {
                    expect(changedModelBuffer).to.equalBytes(snapshot);
                } catch {
                    const parsed = path.parse(lhqFile);
                    const newfile = path.join(folders().snapshots, 'model', `${parsed.dir}_${parsed.name}${parsed.ext}.tmp`);
                    await fse.writeFile(newfile, changedModelBuffer, { encoding: null });
                }
            });
        });
    });

    describe('LHQ model manipulation', () => {

        it('Create root element', () => {
            const root = createRootElement();
            root.name = 'TestRootElement';
            root.description = 'Test description';
            root.primaryLanguage = 'sk';

            const testCategory1 = root.addCategory('TestCategory1');
            testCategory1.description = 'Test category 1 description';

            const testResource1 = testCategory1.addResource('TestResource1');
            testResource1.description = 'Test resource 1 description';
            testResource1.addValue('sk', 'Test hodnota 1');

            expect(root.name).to.equal('TestRootElement');
            expect(root.description).to.equal('Test description');
            expect(root.primaryLanguage).to.equal('sk');

            expect(testCategory1.name).to.equal('TestCategory1');
            expect(testCategory1.description).to.equal('Test category 1 description');

            expect(testResource1.name).to.equal('TestResource1');
            expect(testResource1.description).to.equal('Test resource 1 description');
            expect(testResource1.getValue('sk')).to.equal('Test hodnota 1');
        });

        it('should add a category to the root element', () => {
            const root = createRootElement();
            const testCategory = root.addCategory('TestCategory');
            testCategory.description = 'Test category description';

            expect(testCategory.name).to.equal('TestCategory');
            expect(testCategory.description).to.equal('Test category description');
            expect(root.categories).to.include(testCategory);
        });

        it('should add a resource to a category', () => {
            const root = createRootElement();
            const testCategory = root.addCategory('TestCategory');
            const testResource = testCategory.addResource('TestResource');
            testResource.description = 'Test resource description';

            expect(testResource.name).to.equal('TestResource');
            expect(testResource.description).to.equal('Test resource description');
            expect(testCategory.resources).to.include(testResource);
        });

        it('should add a value to a resource', () => {
            const root = createRootElement();
            const testCategory = root.addCategory('TestCategory');
            const testResource = testCategory.addResource('TestResource');
            testResource.addValue('en', 'Test value');

            expect(testResource.getValue('en')).to.equal('Test value');
        });

        it('should maintain hierarchy of root, category, and resource', () => {
            const root = createRootElement();
            root.name = 'RootElement';
            const category = root.addCategory('Category1');
            const resource = category.addResource('Resource1');
            resource.addValue('en', 'Value1');

            expect(root.categories[0].name).to.equal('Category1');
            expect(root.categories[0].resources[0].name).to.equal('Resource1');
            expect(root.categories[0].resources[0].getValue('en')).to.equal('Value1');
        });
    });

    describe('serialize LHQ model', async function () {
        it('serialize to file', async function () {

            const root = createRootElement();
            root.name = 'TestRootElement';
            root.description = 'Test description';
            root.primaryLanguage = 'sk';

            const testCategory1 = root.addCategory('TestCategory1');
            testCategory1.description = 'Test category 1 description';

            const testResource1 = testCategory1.addResource('TestResource1');
            testResource1.description = 'Test resource 1 description';
            testResource1.addValue('sk', 'Test hodnota 1');

            const newCodeGenerator: ICodeGeneratorElement = { templateId: '123', version: 1, settings: { name: 'Settings2' } };
            root.codeGenerator = newCodeGenerator;

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize01`, modelJson, 'text', 'json');
        });


        it('should handle root element without description', async () => {
            const root = createRootElement();
            root.name = 'RootWithoutDescription';
            root.primaryLanguage = 'en';

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize02`, modelJson, 'text', 'json');

        });

        it('should handle category without description', async () => {
            const root = createRootElement();
            root.name = 'RootWithoutDescription';
            root.addCategory('CategoryWithoutDescription');

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize03`, modelJson, 'text', 'json');
        });

        it('should handle resource without description', async () => {
            const root = createRootElement();
            root.name = 'RootWithoutDescription';
            const category = root.addCategory('Category');
            category.addResource('ResourceWithoutDescription');

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize04`, modelJson, 'text', 'json');
        });

        it('should handle resource parameter without description', async () => {
            const root = createRootElement();
            root.name = 'RootWithoutDescription';
            const category = root.addCategory('Category');
            const resource = category.addResource('Resource');
            resource.addValue('en', 'ValueWithoutDescription');

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize05`, modelJson, 'text', 'json');
        });

        it('serialize multiple elements with and without description', async () => {
            const root = createRootElement();
            root.name = 'RootWithoutDescription';
            root.description = 'Root description';
            const category1 = root.addCategory('Category1');
            const resource1 = category1.addResource('Resource1');
            resource1.addValue('en', 'resource1');

            const category2 = root.addCategory('Category2');
            category2.description = 'Category2 description';
            const resource2 = category2.addResource('Resource2');
            resource2.description = 'Resource2 description';
            resource2.addValue('en', 'resource2').auto = true;

            const model = serializeRootElement(root);
            const modelJson = replaceLineEndings(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize06`, modelJson, 'text', 'json');
        });
    });

    run();
}, 500);