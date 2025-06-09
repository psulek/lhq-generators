import { expect } from 'chai';

import { verify } from './testUtils.js';

import { FormattingOptions, IRootModelElement, ModelSerializer } from '../src';

setTimeout(async () => {

    const defaultFormatting: FormattingOptions = {
        indentation: {
            amount: 2,
            type: 'space'
        },
        eol: 'LF'
    };

    describe('serialize and deserialize in memory', () => {
        it('serialize all properties and values', async function () {
            const root = createSampleModel();
            const data = ModelSerializer.serializeTreeElement(root, defaultFormatting);
            await verify('mappings', 'allvalues', data, 'json', 'json');

        });

        it('serialize root only with languages', async function () {
            const root = createSampleModel();
            root.removeCategory('Category1');
            root.removeCategory('Category2');
            root.removeResource('RootResource1');
            const data = ModelSerializer.serializeTreeElement(root, defaultFormatting);
            await verify('mappings', 'rootonlylangs', data, 'json', 'json');
        });

        it('serialize root only', async function () {
            const root = createSampleModel();
            root.languages = [];
            root.description = '';
            root.name = '';
            root.removeCategory('Category1');
            root.removeCategory('Category2');
            root.removeResource('RootResource1');
            const data = ModelSerializer.serializeTreeElement(root, defaultFormatting);
            await verify('mappings', 'rootonly', data, 'json', 'json');
        });
    });

    function createSampleModel(): IRootModelElement {
        const root = ModelSerializer.createRootElement();
        root.languages = ['sk', 'en'];
        root.name = 'RootElement';
        root.description = 'Root description';
        root.primaryLanguage = 'sk';
        root.options = { categories: false, resources: 'Categories' }

        expect(root.paths.getParentPath('/', true), 'root_path1').to.equal(`/RootElement`);

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

        const rootResource1 = root.addResource('RootResource1');
        rootResource1.description = 'Root resource 1 description';
        rootResource1.addValue('sk', 'Root value 1 sk');
        rootResource1.addValue('en', 'Root value 1 en');

        return root;
    }
    run();
}, 500);