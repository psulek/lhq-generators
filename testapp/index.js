const fs = require('fs/promises');
const path = require('path');
const lhq = require('@lhq/lhq-generators');
const generatorUtils = lhq.generatorUtils;
const isNullOrEmpty = lhq.isNullOrEmpty;
const tryRemoveBOM = lhq.tryRemoveBOM;

(async () => {
    try {
        const content = {};

        const res = generatorUtils.validateLhqModel(content);
        console.log(res);

        const schema = generatorUtils.generateLhqSchema();
        console.log(schema);

        // const fileName = path.join(__dirname, 'Strings.lhq');
        const fileName = path.resolve('../tests/data/templates/NetCoreResxCsharp01/Strings.lhq');
        const modelJson = await safeReadFile(fileName);

        const model = JSON.parse(modelJson);

        const rootElement = generatorUtils.createRootElement(model);
        console.log(rootElement);

        rootElement.categories.forEach((category) => {
            console.log(category.name);
            category.resources.forEach((resource) => {
                console.log(`\t${resource.name}`);
                resource.values.forEach((value) => {
                    console.log(`\t\t${value.languageName}`, value.value);
                });
            });
        });

    } catch (e) {
        console.error(e);
    }

})();


async function safeReadFile(fileName) {
    const content = await fs.readFile(fileName, { encoding: 'utf-8' });
    return isNullOrEmpty(content) ? '' : tryRemoveBOM(content);
}