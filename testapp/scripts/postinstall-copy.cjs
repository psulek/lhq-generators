const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'node_modules', '@lhq', 'lhq-generators', 'browser', 'index.js');
const targetDir = path.resolve(__dirname, '..', 'web');
const target = path.join(targetDir, 'index.js');

if (!fs.existsSync(source)) {
  console.warn(`[postinstall] Source file not found: ${source}`);
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`[postinstall] Copied ${source} -> ${target}`);
