import path from 'node:path';
import fse from 'fs-extra';
import { generatorUtils, isNullOrEmpty, LhqModel, tryRemoveBOM } from '@lhq/lhq-generators';
import { fileURLToPath } from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    try {

        const content = {} as LhqModel;

        const res = generatorUtils.validateLhqModel(content);
        console.log(res);

        const schema = generatorUtils.generateLhqSchema();
        console.log(schema);

        //const fileName = path.join(__dirname, 'Strings.lhq');
        const fileName = path.resolve('../tests/data/templates/NetCoreResxCsharp01/Strings.lhq');
        const modelJson = await safeReadFile(fileName);

        const model = JSON.parse(modelJson) as LhqModel;

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


async function safeReadFile(fileName: string): Promise<string> {
    if (!(await fse.pathExists(fileName))) {
        throw new Error(`File '${fileName}' not found.`);
    }

    const content = await fse.readFile(fileName, { encoding: 'utf-8' });
    return isNullOrEmpty(content) ? '' : tryRemoveBOM(content);
}