import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { parseFile } from "./src/parse";
import { resolveImports } from "./src/walk";
import { collect, buildPo } from "./src/po";
import { extract, extractPo } from "./src";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "translate-extract-"));
fs.writeFileSync(path.join(tmp, "dep.js"), "// World comment\n t('World');\n");
fs.writeFileSync(
	path.join(tmp, "entry.js"),
	"import './dep.js';\n // Greeting\n t('Hello');\n",
);

const entry = path.join(tmp, "entry.js");

// parseFile should read only current file
const parsed = parseFile(entry);
assert.deepStrictEqual(
	parsed.messages.map((m) => m.msgid),
	["Hello"],
);
assert.strictEqual(parsed.messages[0]?.comments?.extracted, "Greeting");
assert.deepStrictEqual(parsed.imports, ["./dep.js"]);

// resolveImports should resolve import paths
const resolved = resolveImports(entry, parsed.imports);
assert.deepStrictEqual(resolved, [path.join(tmp, "dep.js")]);

// extract should walk dependency graph
const walked = extract(entry);
const messages = collect(walked);
assert(messages.some((m) => m.msgid === "Hello"));
assert(messages.some((m) => m.msgid === "World"));
const worldMsg = messages.find((m) => m.msgid === "World");
assert(worldMsg?.comments.includes("World comment"));

// buildPo should include all messages
const po = buildPo("en", messages);
assert(po.includes("Hello") && po.includes("World"));

// convenience extractPo should work
const po2 = extractPo(entry, "en");
assert(po2.includes("Hello") && po2.includes("World"));

// CLI should output the same
const cli = path.resolve(__dirname, "bin/cli.ts");
const tsx = require.resolve("tsx/cli");
const output = execSync(`node ${tsx} ${cli} entry.js en`, {
	cwd: tmp,
	encoding: "utf8",
});
assert(output.includes("Hello"));
assert(output.includes("World"));

// msg query should extract various message forms
const tmpMsg = fs.mkdtempSync(path.join(os.tmpdir(), "translate-msg-"));
fs.writeFileSync(
	path.join(tmpMsg, "entry.js"),
	`
msg('hello', 'hola');
msg({ id: 'greeting', message: 'Hello world' });
msg({ id: 'onlyId' });
msg({ message: 'onlyMessage' });
/* some */
msg\`Hello!\`;
const name = "World";
msg\`Hello, \${name}!\`;
`,
);

const parsedMsg = parseFile(path.join(tmpMsg, "entry.js"));
assert.deepStrictEqual(
	parsedMsg.messages.map((m) => m.msgid).sort(),
	[
		"hello",
		"greeting",
		"onlyId",
		"onlyMessage",
		"Hello!",
		"Hello, ${name}!",
	].sort(),
);
const hello = parsedMsg.messages.find((m) => m.msgid === "hello");
assert.deepStrictEqual(hello?.msgstr, ["hola"]);
const greeting = parsedMsg.messages.find((m) => m.msgid === "greeting");
assert.deepStrictEqual(greeting?.msgstr, ["Hello world"]);
const commentMsg = parsedMsg.messages.find((m) => m.msgid === "Hello!");
assert.strictEqual(commentMsg?.comments?.extracted, "some");

console.log("extract tests passed");
