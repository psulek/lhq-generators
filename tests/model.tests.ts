import path from 'node:path';
import { expect } from 'chai';
import { glob } from 'glob';
import fse from 'fs-extra';

import { folders, initGenerator, safeReadFile, verify } from './testUtils';
import { detectFormatting, updateEOL } from '../src/utils';
import { LhqModel } from '../src/api/schemas';
import { IResourceElement, IRootModelElement } from '../src/api';
import { CategoryElement } from '../src/model/categoryElement';
import { ResourceElement } from '../src/model/resourceElement';
import { FormattingOptions, ImportResourceItem, modelConst, ModelUtils, sanitizeUnsupportedUnicodeChars, serializeJson } from '../src';
import { MapToModelOptions } from '../src/model/types';

setTimeout(async () => {
    await initGenerator();

    const defaultFormatting: FormattingOptions = {
        indentation: { amount: 2, type: 'space' },
        eol: 'LF',
    };

    function rootElementToModel(root: IRootModelElement, options?: MapToModelOptions): LhqModel {
        options = options ?? {};
        return ModelUtils.rootElementToModel(root, { ...options, applyDefaults: false });
    }

    const lhqFiles = await glob('**/*.lhq', { cwd: folders().templates, nodir: true });
    // const lhqFiles = [path.join('Misc','Strings_Values_Sanitize.lhq')];

    describe('serialize and deserialize in memory (model)', () => {
        lhqFiles.forEach(lhqFile => {
            const ident = lhqFile.replace('.lhq', '');
            it(`serialize and deserialize file ${ident}`, async function () {

                const file = path.join(folders().templates, lhqFile);
                const content = await safeReadFile(file);
                //const lineEndings = detectLineEndings(content)!;
                const formatOptions = detectFormatting(content);
                const model = JSON.parse(content) as LhqModel;

                const root = ModelUtils.createRootElement(model);
                const serializedModel = rootElementToModel(root);
                //const serializedModelJson = serializeJson(serializedModel, formatOptions)

                expect(model).to.deep.eq(serializedModel);
                expect(root.isRoot).to.be.true;

                if (root.hasCategories) {
                    expect(root.categories[0].isRoot).to.be.false;
                }

                if (root.hasResources) {
                    expect(root.resources[0].isRoot).to.be.false;
                }

                // if (ident === 'NetCoreResxCsharp01\\Strings') {
                //     // const rp = root.paths.getPaths(true);

                //     // const paths = ModelUtils.createTreePaths('/Cars/Diesel/Old', '/');
                //     // const f1 = root.getElementByPath(paths, 'resource');
                //     // console.log('f1', f1);

                //     // const res = root.resources[0];
                //     // const json1 = (res as ResourceElement).debugSerialize();
                //     // console.log('json1', json1);
                // }

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
            root.addLanguage('sk');

            expect(root.primaryLanguage).to.be.undefined;

            root.primaryLanguage = 'sk';
            expect(root.primaryLanguage).to.equal('sk');

            const testCategory1 = root.addCategory('TestCategory1');
            testCategory1.description = 'Test category 1 description';

            const testResource1 = testCategory1.addResource('TestResource1');
            expect(testResource1.paths.getParentPath('/', true)).to.equal('/TestRootElement/TestCategory1/TestResource1');
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

            expect(testResource1.changeParent(root)).to.be.true;
            expect(testResource1.parent).to.equal(root);
            expect(testResource1.paths.getParentPath('/', true)).to.equal('/TestRootElement/TestResource1');

            expect(testCategory1.changeParent(testCategory1)).to.be.false; // cannot change parent to itself


            const clonedResource = ModelUtils.cloneElement(testResource1, 'TestResource1') as IResourceElement;
            expect(clonedResource.name).to.equal('TestResource11');

            expect(testResource1.parent?.resources.includes(clonedResource)).to.be.true;
        });

        it('should add a category to the root element', () => {
            const root = ModelUtils.createRootElement();
            const testCategory = root.addCategory('TestCategory');
            testCategory.description = 'Test category description';

            expect(testCategory.name).to.equal('TestCategory');
            expect(testCategory.description).to.equal('Test category description');
            expect(root.categories).to.include(testCategory);
        });

        it('add category should respect sorting by asc', () => {
            const root = ModelUtils.createRootElement();
            root.addCategory('AWT');
            root.addCategory('Application');

            expect(root.categories[0].name).to.equal('Application');
            expect(root.categories[1].name).to.equal('AWT');
        });

        it('add resource should respect sorting by asc', () => {
            const root = ModelUtils.createRootElement();
            root.addResource('AWT');
            root.addResource('Application');

            expect(root.resources[0].name).to.equal('Application');
            expect(root.resources[1].name).to.equal('AWT');
        });

        it('add resource values should respect sorting by asc', () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('sk', true);
            root.addLanguage('en');

            // order of languages in root should be preserved and will not be sorted on add!
            expect(root.languages[0]).to.equal('sk');
            expect(root.languages[1]).to.equal('en');

            const resource = root.addResource('AWT');
            resource.addValue('sk', 'slovak value');
            resource.addValue('en', 'english value');

            expect(resource.values[0].languageName).to.equal('en');
            expect(resource.values[1].languageName).to.equal('sk');

            const appResource = root.addResource('Application');
            appResource.addValues([{ languageName: 'sk', value: 'sk value' }, { languageName: 'en', value: 'eng value' }]);
            expect(appResource.values[0].languageName).to.equal('en');
            expect(appResource.values[1].languageName).to.equal('sk');
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
            root.addLanguage('en', true);
            const testCategory = root.addCategory('TestCategory');
            const testResource = testCategory.addResource('TestResource');
            testResource.addValue('en', 'Test value');

            expect(testResource.getValue('en')).to.equal('Test value');
        });

        it('should maintain hierarchy of root, category, and resource', () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
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
            root.addLanguage('sk', true);

            const testCategory1 = root.addCategory('TestCategory1');
            testCategory1.description = 'Test category 1 description';

            const testResource1 = testCategory1.addResource('TestResource1');
            testResource1.description = 'Test resource 1 description';
            testResource1.addValue('sk', 'Test hodnota 1');

            const newCodeGenerator = ModelUtils.createCodeGeneratorElement('NetCoreResxCsharp01', { CSharp: { Enabled: false } })
            root.codeGenerator = newCodeGenerator;

            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `serialize01`, modelJson, 'text', 'json');

            newCodeGenerator.settings['CSharp']['Enabled'] = true;
            root.codeGenerator = newCodeGenerator;

            const model2 = rootElementToModel(root);
            const modelJson2 = ModelUtils.serializeModel(model2, defaultFormatting);
            await verify('model', `serialize01b`, modelJson2, 'text', 'json');
        });

        it('sould serialize resources values with CRLF', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.addResource('TestResource').addValue('en', 'Test value with CRLF\r\nNew line');

            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `values-eol-01`, modelJson, 'text', 'json');
        });

        it('sould serialize resources values overwrite with LF', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.addResource('TestResource').addValue('en', 'Test value with CRLF\r\nNew line');

            root.options.values = { eol: 'LF' };
            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `values-eol-02`, modelJson, 'text', 'json');
        });

        it('should serialize resources values overwrite with CRLF', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.addResource('TestResource').addValue('en', 'Test value with CRLF\rNew \nline');

            root.options.values = { eol: 'CRLF' };
            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `values-eol-03`, modelJson, 'text', 'json');
        });

        it('should serialize languages in correct order', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguages(['sk', 'en', 'de'], 'en');

            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `languages-order-01`, modelJson, 'text', 'json');
        });

        async function sanitizeUnicode(sanitize: boolean) {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.addResource('TestResource').addValue('en', `A\u00A0B\u202FC\uFEFFD\u2007E\u2060F
G\u007FH\u2000I\u200BI\u200DJ\u200FK
L\u202AL\u202BM\u202CM\u202DM\u202E
N\u2060O\u2061P\u2062Q\u2063R\u2064S
\u2010\u2011\u2012\u2013\u2014\u2015\u2016\u2017\u2018\u2019\u201C\u201D
`);

            root.options.values = { sanitize };
            const model = rootElementToModel(root);
            const modelJson = ModelUtils.serializeModel(model, defaultFormatting);
            await verify('model', `values-unicode-0` + (sanitize ? 1 : 2), modelJson, 'text', 'json');

        }

        it('sanitize non-breaking spaces', async () => {
            const src = `customer operation  <b>{3}</b>`;
            expect(ModelUtils.containsInvalidUnicodeChars(src)).to.be.true;

            const sanitized = sanitizeUnsupportedUnicodeChars(src);
            expect(sanitized).to.equal('customer operation  <b>{3}</b>');
            expect(sanitized).to.not.equal(src);
        });

        it('should remove/replace non-valid unicode chars', async () => {
            await sanitizeUnicode(true);
        });

        it('should left non-valid unicode chars', async () => {
            await sanitizeUnicode(false);
        });


        it('serialize eol and sanitize options', async function () {
            const root = ModelUtils.createRootElement();
            root.addResource('TestResource1').addValue('en', 'line1\r\nline2\rline3');
            root.addResource('TestResource2').addValue('en', 'A\u00A0B\u202FC\uFEFFD\u2007E\u2060F');

            root.options.values = { eol: 'LF', sanitize: true };
            const model01 = rootElementToModel(root);
            const model01Json = ModelUtils.serializeModel(model01, defaultFormatting);
            await verify('model', `values-options-01`, model01Json, 'text', 'json');

            root.options.values = { eol: 'CRLF', sanitize: false };
            const model02 = rootElementToModel(root);
            const model02Json = ModelUtils.serializeModel(model02, defaultFormatting);
            await verify('model', `values-options-02`, model02Json, 'text', 'json');
        });

        it('verify loadAndSerialize', async function () {
            //const json =`{"model":{"uid":"6ce4d54c5dbd415c93019d315e278638","version":3,"options":{"categories":true,"resources":"All","values":{"eol":"LF"}},"name":"Strings1","primaryLanguage":"en"},"languages":["cs","en","sk"],"resources":{"ButtonOK":{"state":"New","values":{"cs":{"value":"Tlačítko O K cesky\r\n"},"en":{"value":"Button O K eng"},"sk":{"value":"\r\nTlačidlo OK svk"}}},"Cancel":{"state":"Edited","values":{"en":{"value":"Cancel"},"sk":{"value":"zrusit\ndaco\n1\r\n2"}}}},"metadatas":{"childs":[{"name":"metadata","attrs":{"descriptorUID":"b40c8a1d-23b7-4f78-991b-c24898596dd2"},"childs":[{"name":"content","attrs":{"templateId":"NetCoreResxCsharp01","version":"1"},"childs":[{"name":"Settings","childs":[{"name":"CSharp","attrs":{"OutputFolder":"Resources2","EncodingWithBOM":"false","LineEndings":"LF","UseExpressionBodySyntax":"false","Namespace":"n1","MissingTranslationFallbackToPrimary":"false"}},{"name":"ResX","attrs":{"OutputFolder":"Resources","EncodingWithBOM":"false","LineEndings":"LF","CultureCodeInFileNameForPrimaryLanguage":"true"}}]}]}]}]}}`;

            const file = path.join(folders().data, 'misc', 'Strings_Values_Sanitize.lhq');
            const content = await safeReadFile(file);
            const formatting = detectFormatting(content);
            //console.log(' loadAndSerialize> detected formatting: ', formatting);

            const json2 = ModelUtils.loadAndSerialize(content, undefined, formatting);
            // const formatting2 = detectFormatting(json2);
            // console.log(' loadAndSerialize> re-serialized formatting: ', formatting2);
            await verify('model', `load-and-serialize-01`, json2, 'text', 'json');
        });

        it('should handle root element without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            root.addLanguage('en', true);

            const model = rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize02`, modelJson, 'text', 'json');

        });

        it('should handle category without description', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.name = 'RootWithoutDescription';
            root.addCategory('CategoryWithoutDescription');

            const model = rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize03`, modelJson, 'text', 'json');
        });

        it('should handle resource without description', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
            root.name = 'RootWithoutDescription';
            const category = root.addCategory('Category');
            category.addResource('ResourceWithoutDescription');

            const model = rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize04`, modelJson, 'text', 'json');
        });

        it('should handle resource parameter without description', async () => {
            const root = ModelUtils.createRootElement();
            root.name = 'RootWithoutDescription';
            root.addLanguage('en', true);
            const category = root.addCategory('Category');
            const resource = category.addResource('Resource');
            resource.addValue('en', 'ValueWithoutDescription');

            const model = rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize05`, modelJson, 'text', 'json');
        });

        it('serialize multiple elements with and without description', async () => {
            const root = ModelUtils.createRootElement();
            root.addLanguage('en', true);
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

            const model = rootElementToModel(root);
            const modelJson = updateEOL(JSON.stringify(model, null, 2), 'LF');
            await verify('model', `serialize06`, modelJson, 'text', 'json');
        });

        const lhqFile = path.join('LhqEditor','Strings.lhq');
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
            const lhqFile = path.join('NetCoreResxCsharp01','Strings.lhq');
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
            root.addLanguage('sk', true);

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

        it('clone element', async function () {
            const root = createSampleModel();
            const category1 = root.getCategory('Category1')!;
            const resource1 = category1.getResource('Resource1')!;

            expect(resource1.paths.getParentPath('/', true), 'path1').to.equal('/RootElement/Category1/Resource1');

            const clonedResource = ModelUtils.cloneElement(resource1, 'ClonedResource') as IResourceElement;
            expect(clonedResource.name).to.equal('ClonedResource');
            expect(clonedResource.paths.getParentPath('/', true), 'path2').to.equal('/RootElement/Category1/ClonedResource');
            expect(category1.resources).to.include(clonedResource);


            const rootJson = ModelUtils.serializeTreeElement(root, defaultFormatting);
            const clonedRoot = ModelUtils.cloneElement(root) as IRootModelElement;
            const clonedRootJson = ModelUtils.serializeTreeElement(clonedRoot, defaultFormatting);

            expect(clonedRootJson).to.eq(rootJson);

            await verify('model', `cloned01-origin`, rootJson, 'text', 'json');
            await verify('model', `cloned01-cloned`, clonedRootJson, 'text', 'json');

            //expect(clonedRoot).to.deep.eq(root);
        });

        it('add multiple languages', async function () {
            const root = ModelUtils.createRootElement();
            root.addLanguages(['de', 'sk', 'en']);
            expect(root.primaryLanguage).to.equal('de');

            const root2 = ModelUtils.createRootElement();
            root2.addLanguages(['sk', 'en', 'it'], 'it');
            expect(root2.primaryLanguage).to.equal('it');
        });

        it('import model 01', async function () {
            const model1 = ModelUtils.createRootElement();
            model1.name = 'model1';
            model1.addLanguages(['en', 'sk']);
            expect(model1.primaryLanguage).to.equal('en');

            const buttons = model1.addCategory('Buttons');
            buttons.addResource('Accept').addValue('en', 'Accept');

            const btnCancel = buttons.addResource('Cancel');
            btnCancel.addValue('en', 'Cancel');
            btnCancel.addValue('sk', '');

            const model2 = ModelUtils.cloneElement(model1, 'model2') as IRootModelElement;
            model2.find('Buttons', 'category')!.find('Accept', 'resource')?.setValue('sk', 'Prijať');
            model2.find('Buttons', 'category')!.find('Cancel', 'resource')?.setValue('sk', 'Zrušiť');

            const result = ModelUtils.importModel(model1, 'merge', { sourceKind: 'model', source: model2, cloneSource: false, importNewLanguages: true });
            expect(result).not.undefined;
            expect(result.error).to.be.undefined;
            expect(result.resultModel).not.undefined;
            expect(result.resultModel).to.be.eq(model1);

            const resultModelJson = ModelUtils.serializeTreeElement(result.resultModel, defaultFormatting);
            await verify('model', `import01`, resultModelJson, 'text', 'json');
        });

        it('import model 02', async function () {
            const model1 = ModelUtils.createRootElement();
            model1.name = 'model1';
            model1.addLanguage('en', true);
            expect(model1.primaryLanguage).to.equal('en');

            const buttons = model1.addCategory('Buttons');
            buttons.addResource('Accept').addValue('en', 'Accept');

            const btnCancel = buttons.addResource('Cancel');
            btnCancel.addValue('en', '');

            const model2 = ModelUtils.cloneElement(model1, 'model2') as IRootModelElement;
            model2.addLanguage('sk');
            model2.find('Buttons', 'category')!.find('Accept', 'resource')?.setValue('sk', 'Prijať');
            model2.find('Buttons', 'category')!.find('Cancel', 'resource')?.setValue('sk', 'Zrušiť');
            model2.find('Buttons', 'category')!.find('Cancel', 'resource')?.setValue('en', 'Cancel');

            const result = ModelUtils.importModel(model1, 'merge', { sourceKind: 'model', source: model2, cloneSource: false, importNewLanguages: true });
            expect(result).not.undefined;
            expect(result.error).to.be.undefined;
            expect(result.resultModel).not.undefined;
            expect(result.resultModel).to.be.eq(model1);
            expect(result.resultModel.languages).to.deep.equal(['en', 'sk']);
            expect(result.resultModel.primaryLanguage).to.be.eq('en');

            const resultModelJson = ModelUtils.serializeTreeElement(result.resultModel, defaultFormatting);
            await verify('model', `import02`, resultModelJson, 'text', 'json');
        });

        it('import model 03', async function () {
            const model1 = ModelUtils.createRootElement();
            model1.name = 'model1';
            model1.addLanguage('en', true);
            expect(model1.primaryLanguage).to.equal('en');

            const buttons = model1.addCategory('Buttons');
            const btnAccept = buttons.addResource('Accept');
            btnAccept.addValue('en', 'Accept');
            const param1 = btnAccept.addParameter('param1');
            param1.description = 'Parameter 1 description';
            expect(param1.order).to.equal(0);

            const btnCancel = buttons.addResource('Cancel');
            btnCancel.addValue('en', '');

            const model2 = ModelUtils.cloneElement(model1, 'model2') as IRootModelElement;
            const btnAccept2 = model2.find('Buttons', 'category')!.find('Accept', 'resource')!;

            btnAccept2.findParameter('param1')!.order = 2;

            const result = ModelUtils.importModel(model1, 'merge', { sourceKind: 'model', source: model2, cloneSource: false, importNewLanguages: true });
            expect(result).not.undefined;
            expect(result.error).to.be.undefined;
            expect(result.resultModel).not.undefined;
            expect(result.resultModel).to.be.eq(model1);

            const importedParam1 = result.resultModel.find('Buttons', 'category')!.find('Accept', 'resource')!.findParameter('param1')!;
            expect(importedParam1).not.undefined;
            expect(importedParam1.order).to.equal(2);


            const resultModelJson = ModelUtils.serializeTreeElement(result.resultModel, defaultFormatting);
            await verify('model', `import03`, resultModelJson, 'text', 'json');
        });

        const lhqFile_v1 = 'v1.lhq';
        it(`upgrade ${lhqFile_v1} to latest model version`, async function () {

            const file = path.join(folders().data, 'versions', lhqFile_v1);
            const content = await safeReadFile(file);
            const formatting = detectFormatting(content);
            let root = ModelUtils.createRootElement(content);

            const oldVersion = root.version;
            expect(oldVersion).to.be.eq(1);

            const upgradeResult = ModelUtils.upgradeModel(root);
            expect(upgradeResult.success).to.be.true;
            expect(upgradeResult.error).to.be.undefined;
            root = upgradeResult.rootModel!;
            expect(root).not.undefined;

            //root = ModelUtils.createRootElement(model);

            expect(root.version).to.be.eq(modelConst.ModelVersions.model);
            expect(root.codeGenerator!.version).to.be.eq(modelConst.ModelVersions.codeGenerator);
            expect(root.codeGenerator?.settings['CSharp']['OutputFolder']).to.be.eq('Resources1');
            expect(root.codeGenerator?.settings['ResX']['OutputFolder']).to.be.eq('Resources2');

            const modelJson = ModelUtils.serializeTreeElement(root, formatting);
            await verify('versions', `upgraded_v${oldVersion}-v${root.version}`, modelJson, 'text', 'json');
        });

        it('import model rows 01', async function () {
            const model1 = ModelUtils.createRootElement();
            model1.name = 'model1';
            model1.addLanguage('en', true);

            const rootResource1 = model1.addResource('RootResource1');
            rootResource1.addValue('en', 'Root value 1 en');
            rootResource1.addValue('sk', 'Root value 1 sk');

            const buttons = model1.addCategory('Buttons');
            const btnAccept = buttons.addResource('Accept');
            btnAccept.addValue('en', 'Accept');

            const btnCancel = buttons.addResource('Cancel');
            btnCancel.addValue('en', 'Cancel');
            //btnCancel.addValue('sk', '');

            const rows: ImportResourceItem[] = [
                {
                    paths: btnCancel.paths.clone(false),
                    values: [
                        {
                            language: 'sk',
                            value: 'Zrušiť'
                        }
                    ]
                },
                {
                    paths: btnAccept.paths.clone(false),
                    values: [
                        {
                            language: 'sk',
                            value: 'Prijať'
                        }
                    ]
                },
                {
                    paths: rootResource1.paths.clone(false),
                    values: [
                        { language: 'en', value: 'Root value 1 updated en' },
                        { language: 'sk', value: 'Root value 1 updated sk' }
                    ]
                }
            ];

            const result = ModelUtils.importModel(model1, 'merge', { sourceKind: 'rows', source: rows, cloneSource: false, importNewLanguages: true });
            expect(result).not.undefined;
            expect(result.error).to.be.undefined;
            expect(result.resultModel).not.undefined;
            expect(result.resultModel).to.be.eq(model1);

            const resultModelJson = ModelUtils.serializeTreeElement(result.resultModel, defaultFormatting);
            await verify('model', `import-rows01`, resultModelJson, 'text', 'json');
        });

    });

    run();
}, 500);