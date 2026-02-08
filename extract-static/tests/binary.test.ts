import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { binaryPath } from "../src/binary.ts";

const execFileAsync = promisify(execFile);

const root = join(import.meta.dirname, "fixture");
const translations = join(root, "translations");
const nodeModules = resolve(import.meta.dirname, "../../node_modules");

test.skip("compiled binary produces po files", async (t) => {
    t.after(async () => {
        await rm(translations, { recursive: true, force: true });
    });

    await execFileAsync(binaryPath, [], {
        cwd: root,
        timeout: 30_000,
        env: { ...process.env, NODE_PATH: nodeModules },
    });

    const files = await readdir(translations);
    const poFiles = files.filter((f) => f.endsWith(".po")).sort();
    assert.deepEqual(poFiles, ["index.en.po", "index.fr.po"]);

    // Verify that the PO files contain the expected messages
    const enPo = await readFile(join(translations, "index.en.po"), "utf-8");
    assert.ok(enPo.includes('msgid "Hello, world!"'), "en.po should contain Hello, world!");
    assert.ok(enPo.includes('msgid "Goodbye!"'), "en.po should contain Goodbye!");

    const frPo = await readFile(join(translations, "index.fr.po"), "utf-8");
    assert.ok(frPo.includes('msgid "Hello, world!"'), "fr.po should contain Hello, world!");
    assert.ok(frPo.includes('msgid "Goodbye!"'), "fr.po should contain Goodbye!");
});
