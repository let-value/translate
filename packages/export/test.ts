import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'translate-export-'));
fs.writeFileSync(
  path.join(tmp, 'dep.js'),
  "// World comment\n t('World');\n"
);
fs.writeFileSync(
  path.join(tmp, 'entry.js'),
  "import './dep.js';\n // Greeting\n t('Hello');\n",
);

const cli = path.resolve(__dirname, 'bin/cli.ts');
const tsx = require.resolve('tsx/cli');
const output = execSync(`node ${tsx} ${cli} entry.js en`, {
  cwd: tmp,
  encoding: 'utf8'
});
assert(output.length > 0);
console.log('export test passed');

