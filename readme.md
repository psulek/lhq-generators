# LHQ generators library

Javascript library used by various LHQ application to parse, validate and run code templates against LHQ model files.

## Table of Contents

- [Installation](#installation)
- [Library](#library)
- [LHQ Tempaltes](#lhq-templates)
- [Applications](#applications)
- [Changelog](./CHANGELOG.md)

### Installation

To install the `@lhq/lhq-generators` package, use the following command:

**npm:**

```bash
npm install @lhq/lhq-generators
```

**yarn:**

```bash
yarn add @lhq/lhq-generators
```

**pnpm:**

```bash
pnpm install @lhq/lhq-generators
```

### Library

The `@lhq/lhq-generators` library package includes the following features:

- **LHQ model API**
  - validation of LHQ model files `*.lhq` against the LHQ schema
  - generation of custom files from `*.lhq` files using handlebarsjs templates

- **TypeScript type definitions**
  - types for LHQ model schema
  - types for LHQ model API (validate, generate)

- **CLI Tool**:
  - A command-line tool `lhqcmd` responsible for validating LHQ model files and generating custom files from LHQ model using handlebarsjs templates.

Package supports these JS module types:

- CommonJS (CJS)
  
  require `@lhq/lhq-generators` package in your code:

  ```js
  const fs = require('fs/promises');
  const generatorUtils = require('@lhq/lhq-generators').generatorUtils;
  ```

- ES Module (ESM)
  
  import `@lhq/lhq-generators` package in your code:

  ```ts
  import fs from 'node:fs/promises';
  import { generatorUtils } from '@lhq/lhq-generators';
  ```

For both ESM & CJS, usage of required/imported module in your code:

```ts
  const fileName = 'Strings.lhq';
  const content = await fs.readFile(fileName, { encoding: 'utf-8' });

  // validate LHQ model file as:
  // 1) lhq file content as string
  const result = generatorUtils.validateLhqModel(content);

  // 2) lhq file content as parsed json object
  const model = JSON.parse(modelJson) as LhqModel;
  const result = generatorUtils.validateLhqModel(model);

  // create 'root element' instance from LHQ model
  const rootElement = generatorUtils.createRootElement(model);
  // traverse model categories/resources tree
  rootElement.categories.forEach((category) => {
      console.log(category.name);
      category.resources.forEach((resource) => {
          console.log(`\t${resource.name}`);
          resource.values.forEach((value) => {
              console.log(`\t\t${value.languageName}`, value.value);
          });
      });
  });
```

- IIFE (global `LhqGenerators` in browser)
  
  use global `LhqGenerators` object in your html page:

  ```html
  <html>
  <input type="text" id="lhqModel">
  <div id="validationResult">

  <script>
    var modelString = document.getElementById('lhqModel').value;
    var result = LhqGenerators.generatorUtils.validateLhqModel(modelString);
    document.getElementById('validationResult').innerText = JSON.stringify(result, null, 2);
  </script>
  </html>
  ```

  > [!Note]
  > - The `@lhq/lhq-generators` package contains file `browser\index.js` to be included in html page.
  > - Browser script file has no external dependencies

### LHQ Templates

LHQ model files are used to generate custom files using handlebarsjs templates.

- Templates are stored in the `hbs` folder of the package.
- Name part of file name is used as template identifier in the LHQ model file.
- For example, file `hbs/NetCoreResxCsharp01.hbs` an template id is `NetCoreResxCsharp01`.
- Then generator loads the LHQ file, it reads the template id and loads the template from the package `hbs` folder.
- The template is then invoked (by handlebarsjs engine) to generate the custom file(s) from the LHQ model.

> [!Note]
>
> - LHQ generator engine supports only build-in handlebarsjs templates
> - Custom templates may be added in the future (create a feature request)

### Applications

Currently there are few applications that use the `@lhq/lhq-generators` package, made by LHQ team itself.

#### Windows

- standalone UI Windows Desktop application `LHQ.App.exe`
- command line tool for windows `lhqcmd.exe`
- Visual Studio 2019 /2022 extension
  - [LHQ Editor](https://marketplace.visualstudio.com/items?itemName=scalehqsolutions.lhqeditor)
  - [LHQ Editor VS2022](https://marketplace.visualstudio.com/items?itemName=scalehqsolutions.lhqeditorvs2022)

> [!Note]
> Check [Github Releases](https://github.com/psulek/lhqeditor/releases) for the latest version of any of the above applications.

#### Any OS

This NPM package for LHQ model file generation `@lhq/lhq-generators`.

- working with LHQ models (validate, generate) in code (with ts definitions)
- run cmd line tool within nodejs context `lhqcmd`
  - installed in `node_modules/.bin`
  - run with npm: `npm run lhqcmd Strings.lhq validate`

> [!Note]
> Check npmjs registry for the latest version of this package: [@lhq/lhq-generators](https://www.npmjs.com/package/@lhq/lhq-generators).
