import path from 'node:path';
import { expect } from 'chai';
import { glob } from 'glob';
import fse from 'fs-extra';

import { folders, initGenerator, safeReadFile, verify } from './testUtils';
import { detectFormatting, updateEOL } from '../src/utils';
import { LhqModel } from '../src/api/schemas';
import { IRootModelElement } from '../src/api';
import { CategoryElement } from '../src/model/categoryElement';
import { ResourceElement } from '../src/model/resourceElement';
import { FormattingOptions, ModelUtils } from '../src';

setTimeout(async () => {
    await initGenerator();

    const defaultFormatting: FormattingOptions = {
        indentation: { amount: 2, type: 'space' },
        eol: 'LF',
    };

    const lhqFiles = await glob('**/*.lhq', { cwd: folders().templates, nodir: true });
    // const lhqFiles = ['NetCoreResxCsharp01\\Strings.lhq'];

    describe('serialize and deserialize in memory', () => {
        lhqFiles.forEach(lhqFile => {
            const ident = lhqFile.replace('.lhq', '');
            it(`serialize and deserialize file ${ident}`, async function () {

                const file = path.join(folders().templates, lhqFile);
                const content = await safeReadFile(file);
                //const lineEndings = detectLineEndings(content)!;
                const formatOptions = detectFormatting(content);
                const model = JSON.parse(content) as LhqModel;

                const root = ModelUtils.createRootElement(model);
                const serializedModel = ModelUtils.rootElementToModel(root);

                expect(model).to.deep.eq(serializedModel);
                expect(root.isRoot).to.be.true;

                if (root.hasCategories) {
                    expect(root.categories[0].isRoot).to.be.false;
                }

                if (root.hasResources) {
                    expect(root.resources[0].isRoot).to.be.false;
                }

                if (ident === 'NetCoreResxCsharp01\\Strings') {
                    // const rp = root.paths.getPaths(true);

                    // const paths = ModelUtils.createTreePaths('/Cars/Diesel/Old', '/');
                    // const f1 = root.getElementByPath(paths, 'resource');
                    // console.log('f1', f1);

                    // const res = root.resources[0];
                    // const json1 = (res as ResourceElement).debugSerialize();
                    // console.log('json1', json1);
                }

                const changedModelJson = ModelUtils.serializeModel(model, formatOptions);
                const changedModelBuffer = Buffer.from(changedModelJson, 'utf-8');

                //let snapshotStr = await fse.readFile(file, { encoding: 'utf8' });
                let snapshotStr = await safeReadFile(file);
                const snapshotModel = JSON.parse(snapshotStr) as LhqModel;
                snapshotStr = updateEOL(JSON.stringify(snapshotModel, null, 2), formatOptions.eol);
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
            const root = ModelUtils.createRootElement();
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
            const root = ModelUtils.createRootElement();
            const testCategory = root.addCategory('TestCategory');
            testCategory.description = 'Test category description';

            expect(testCategory.name).to.equal('TestCategory');
            expect(testCategory.description).to.equal('Test category description');
            expect(root.categories).to.include(testCategory);
        });

        it('should add a resource to a category', () => {
            const root = ModelUtils.createRootElement();
            const testCategory = root.addCategory('TestCategory');
            const testResource = testCategory.addResource('TestResource');
            testResource.description = 'Test resource description';

            expect(testResource.name).to.equal('TestResource');
            expect(testResource.description).to.equal('Test resource description');
            expect(testCategory.resources).to.include(testResource);
        });

        it('should add a value to a resource', () => {
            const root = ModelUtils.createRootElement();
            const testCategory = root.addCategory('TestCategory');
            const testResource = testCategory.addResource('TestResource');
            testResource.addValue('en', 'Test value');

            expect(testResource.getValue('en')).to.equal('Test value');
        });

        it('should maintain hierarchy of root, category, and resource', () => {
            const root = ModelUtils.createRootElement();
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

            const root = ModelUtils.createRootElement();
            root.name = 'TestRootElement';
            root.description = 'Test description';
            root.primaryLanguage = 'sk';

            const testCategory1 = root.addCategory('TestCategory1');
            testCategory1.description = 'Test category 1 description';

            const testResource1 = testCategory1.addResource('TestResource1');
            testResource1.description = 'Test resource 1 description';
            testResource1.addValue('sk', 'Test hodnota 1');

            const newCodeGenerator = ModelUtils.createCodeGeneratorElement('NetCoreResxCsharp01', {CSharp: {Enabled: false}})
            root.codeGenerator = newCodeGenerator;

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `serialize01`, modelJson, 'text', 'json');

            newCodeGenerator.settings['CSharp']['Enabled'] = true;
            root.codeGenerator = newCodeGenerator;

            const model2 = ModelUtils.rootElementToModel(root);
            const modelJson2 = ModelUtils.serializeModel(model2, defaultFormatting);
            await verify('model', `serialize01b`, modelJson2, 'text', 'json');
        });

        it('should handle root element without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            root.primaryLanguage = 'en';

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize02`, modelJson, 'text', 'json');

        });

        it('should handle category without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            root.addCategory('CategoryWithoutDescription');

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize03`, modelJson, 'text', 'json');
        });

        it('should handle resource without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            const category = root.addCategory('Category');
            category.addResource('ResourceWithoutDescription');

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize04`, modelJson, 'text', 'json');
        });

        it('should handle resource parameter without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            const category = root.addCategory('Category');
            const resource = category.addResource('Resource');
            resource.addValue('en', 'ValueWithoutDescription');

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize05`, modelJson, 'text', 'json');
        });

        it('serialize multiple elements with and without description', async () => {
            const root = ModelUtils.createRootElement();
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

            const model = ModelUtils.rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize06`, modelJson, 'text', 'json');
        });

        const lhqFile = 'LhqEditor\\Strings.lhq';
        it(`serialize and deserialize file ${lhqFile}`, async function () {

            const file = path.join(folders().templates, lhqFile);
            const content = await safeReadFile(file);
            const formatting = detectFormatting(content);
            const root = ModelUtils.createRootElement(content);
            const modelJson = ModelUtils.serializeTreeElement(root, formatting);
            await verify('model', `serialize07`, modelJson, 'text', 'json');
        });

        it('serialize LHQ model to plain JSON object', async function () {

            const file = path.join(folders().templates, lhqFile);
            const content = await safeReadFile(file);
            const root = ModelUtils.createRootElement(content);

            const plainJson = root.toJson();
            // await verify('model', `toJson01`, JSON.stringify(plainJson, null, 2), 'text', 'json');
            await verify('model', `toJson01`, JSON.stringify(plainJson, null, 2), 'json', 'json');
        });
    });

    describe('LHQ Model operations', () => {
        it('get tree paths', async function () {
            const lhqFile = 'NetCoreResxCsharp01\\Strings.lhq';
            const file = path.join(folders().templates, lhqFile);
            const content = await safeReadFile(file);
            const model = JSON.parse(content) as LhqModel;

            const root = ModelUtils.createRootElement(model);

            let paths = root.paths;
            expect(paths).not.undefined;

            // paths for root element
            expect(paths.getParentPath('/', true), 'root1').to.equal(`/${root.name}`);
            expect(paths.getParentPath('/', false), 'root2').to.equal(`/`);
            expect(paths.getParentPath('/'), 'root3').to.equal(`/`);

            // paths for child elements
            paths = root.getCategory('Cars')?.paths!;
            expect(paths).not.undefined;
            expect(paths.getParentPath('/', true), 'cars1').to.equal(`/Strings/Cars`);
            expect(paths.getParentPath('/', false), 'cars2').to.equal(`/Cars`);
            expect(paths.getParentPath('/'), 'cars3').to.equal(`/Cars`);

            // create tree element paths
            expect(ModelUtils.createTreePaths('/Cars/Diesel/Old', '/').getParentPath('/', true), 'paths1').to.equal('/Cars/Diesel/Old');
            expect(ModelUtils.createTreePaths('/Cars/Diesel/Old').getParentPath('/', true), 'paths2').to.equal('/Cars/Diesel/Old');
            expect(ModelUtils.createTreePaths('/Cars/Diesel/Old').getParentPath('/', false), 'paths3').to.equal('/Diesel/Old');
            expect(ModelUtils.createTreePaths('/Cars/Diesel/Old').getParentPath('/'), 'paths4').to.equal('/Diesel/Old');
            expect(ModelUtils.createTreePaths('@Cars@Diesel@Old', '@').getParentPath('@', true), 'paths5').to.equal('@Cars@Diesel@Old');

            expect(root.getElementByPath(ModelUtils.createTreePaths('/Cars/Diesel/Old'), 'resource')).be.undefined;

            const category_Old = root.getElementByPath(ModelUtils.createTreePaths('/Cars/Diesel/Old'), 'category');
            expect(category_Old).not.undefined;
            expect(category_Old).to.be.instanceOf(CategoryElement);

            expect(category_Old?.getElementByPath(ModelUtils.createTreePaths('/Old_Kia'), 'resource'), 'res1').not.undefined;
            expect(category_Old?.getElementByPath(ModelUtils.createTreePaths('Old_Kia'), 'resource'), 'res2').not.undefined;

            const resource_OldKia = root.getElementByPath(ModelUtils.createTreePaths('/Cars/Diesel/Old/Old_Kia'), 'resource');
            expect(resource_OldKia).not.undefined;
            expect(resource_OldKia).to.be.instanceOf(ResourceElement);

            const category_Diesel = root.getElementByPath(ModelUtils.createTreePaths('/Cars/Diesel'), 'category');
            expect(category_Diesel?.getElementByPath(ModelUtils.createTreePaths('/Old/Old_Kia'), 'resource'), 'getElemByPath1').not.undefined;
            expect(category_Diesel?.getElementByPath(ModelUtils.createTreePaths('Old/Old_Kia'), 'resource'), 'getElemByPath2').not.undefined;

        });

        function createSampleModel(): IRootModelElement {
            const root = ModelUtils.createRootElement();
            root.name = 'RootElement';
            root.description = 'Root description';
            root.primaryLanguage = 'sk';

            expect(root.paths.getParentPath('/', true), 'root_path1').to.equal(`/RootElement`);

            root.name = 'RootElement2';
            expect(root.paths.getParentPath('/', true), 'root_path1').to.equal(`/RootElement2`);
            
            root.name = 'RootElement';

            const category1 = root.addCategory('Category1');
            category1.description = 'Category 1 description';
            expect(category1.paths.getParentPath('/', true), 'category1_path1').to.equal('/RootElement/Category1');

            const resource1 = category1.addResource('Resource1');
            resource1.description = 'Resource 1 description';
            resource1.addValue('sk', 'Value 1');

            const category2 = root.addCategory('Category2');
            category2.description = 'Category 2 description';

            const resource2 = category2.addResource('Resource2');
            resource2.description = 'Resource 2 description';
            resource2.addValue('sk', 'Value 2');

            return root;
        }

        it('change parent of element', async function () {
            const root = createSampleModel();
            const category1 = root.getCategory('Category1')!;
            const category2 = root.getCategory('Category2')!;
            const resource1 = category1.getResource('Resource1')!;

            expect(resource1.paths.getParentPath('/', true), 'path1').to.equal('/RootElement/Category1/Resource1');

            let result = resource1.changeParent(category2);

            expect(result).to.be.true;
            expect(resource1.parent).to.equal(category2);

            expect(category1.getElementByPath(ModelUtils.createTreePaths('Resource1'), 'resource')).be.undefined;
            expect(category2.getElementByPath(ModelUtils.createTreePaths('Resource1'), 'resource')).not.undefined;

            expect(resource1.paths.getParentPath('/', true), 'path2').to.equal('/RootElement/Category2/Resource1');

            // change to same category
            result = resource1.changeParent(category2);
            expect(result).to.be.true;
            expect(resource1.parent).to.equal(category2);

            // move category2 under category1
            result = category2.changeParent(category1);
            expect(result).to.be.true;
            expect(category2.parent).to.equal(category1);
            expect(category1.getElementByPath(ModelUtils.createTreePaths('Category2'), 'category')).not.undefined;
            expect(root.getElementByPath(ModelUtils.createTreePaths('Category2'), 'category')).be.undefined;
        });
    });

    run();
}, 500);