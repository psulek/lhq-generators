import path from 'node:path';
import { expect } from 'chai';

import { createRootElement, serializeRootElement } from '../src/generatorUtils';
import { folders, safeReadFile, verify } from './testUtils';
import { replaceLineEndings } from '../src/utils';
import { LhqModel } from '../src/api/schemas';
import { ICodeGeneratorElement } from '../src/api';

setTimeout(async () => {

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
        it('serialize root element', async function () {

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
            await verify('model', `serialize01`, modelJson, 'text');
        });

        it('serialize and deserialize lhq model', async function () {

            const fileName = path.join(folders().data, './templates/NetCoreResxCsharp01/Strings.lhq');
            const lhqModelContent = await safeReadFile(fileName);
            const model = JSON.parse(lhqModelContent) as LhqModel;

            const root = createRootElement(model);
            const serializedModel = serializeRootElement(root);

            expect(model).to.deep.eq(serializedModel);
        });
    });

    run();
}, 500);