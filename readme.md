# LHQ generators library

Javascript library used by various LHQ application to parse, validate and run code templates against LHQ model files.

## Table of Contents

- [Installation](#installation)
- [Library](#library)
- [CLI](#cli)
- [Code Templates](#code-templates)
- [Applications](#applications)
- [Changelog](./CHANGELOG.md)

### Installation

To install the `@psulek/lhq-generators` package, you need:

#### Create Github PAT token

Create PAT (Personal Access Token) with permissions "read:packages" in your GitHub account settings -> [Personal Access Tokens (classic)](https://github.com/settings/tokens).

#### Update npm configuration

Add the following lines to your npm configuration file `.npmrc` (in your user home folder or in your project folder):

```ini
registry=https://registry.npmjs.org/
@psulek:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN
```

#### Install package

use the following command:

**npm:**

```bash
npm install @psulek/lhq-generators
```

**yarn:**

```bash
yarn add @psulek/lhq-generators
```

**pnpm:**

```bash
pnpm install @psulek/lhq-generators
```

### Library

The `@psulek/lhq-generators` library package includes the following features:

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
  
  require `@psulek/lhq-generators` package in your code:

  ```js
  const fs = require('fs/promises');
  const generatorUtils = require('@psulek/lhq-generators').generatorUtils;
  ```

- ES Module (ESM)
  
  import `@psulek/lhq-generators` package in your code:

  ```ts
  import fs from 'node:fs/promises';
  import { generatorUtils, ModelUtils } from '@psulek/lhq-generators';
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
  const rootElement = ModelUtils.createRootElement(model);
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
  > - The `@psulek/lhq-generators` package contains file `browser\index.js` (or `browser\index.min.js`) to be included in html page.
  > - Browser script file has no external dependencies

### CLI

The `@psulek/lhq-generators` package includes command line tool `lhqcmd`.

When installed as local package, add this to your `package.json` scripts section:

```json
  "scripts": {
    "validate": "lhqcmd Strings.lhq validate",
    "generate": "lhqcmd Strings.lhq -o ./temp"
  }
```

When installed as global package, you can run `lhqcmd` from any folder:

```bash
  lhqcmd Strings.lhq validate
  lhqcmd Strings.lhq -o ./temp
```

### Code Templates

LHQ model files are used as source data for handlebarsjs templates to generate other custom files (currently C# source code files, resx resources, typescript files, json files).

- Templates are stored in the `hbs` folder of the package with `.hbs` file extension
- 1st line of each template file contains the template id
  - example: `{{! template-id: NetCoreResxCsharp01 }}`
- 2nd line contains description of the template
  - example: `{{! template-name: Template which generates strongly typed C# and resource (*.resx) files }}`
- Generator loads the LHQ file, it reads the template id and loads the template from the package `hbs` folder
- The template is then executed (by handlebarsjs engine) to generate the custom file(s) against the LHQ model data

> [!Note]
>
> - LHQ generator engine supports only build-in handlebarsjs templates
> - Custom templates may be added in the future (create a feature request)

### Applications

Currently there are few applications that use the `@psulek/lhq-generators` package:

- standalone Windows Desktop application `LHQ Editor App`
- Windows command line tool `lhqcmd.exe`
- Visual Studio extension
- Visual Studio Code extension (Windows / Linux/ macOS)

> [!Note]
>
> Read more about [LHQ applications](https://github.com/psulek/lhqeditor/wiki/LHQ-Editor-Applications).
