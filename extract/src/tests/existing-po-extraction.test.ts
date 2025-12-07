import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";

import { defineConfig } from "../configuration.ts";
import { run } from "../run.ts";

const initialSource = ['gettext("Hello world");', 'ngettext("One file", "%d files", count);'].join("\n");

const updatedSource = [initialSource, 'gettext("Another message");'].join("\n");

test("extracts new messages when a PO file already exists", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const sourcePath = join(directory, "entry.ts");

    const config = defineConfig({ entrypoints: sourcePath });

    await writeFile(sourcePath, initialSource);
    await run(config.entrypoints[0], { config });

    await writeFile(sourcePath, updatedSource);
    await run(config.entrypoints[0], { config });

    const poPath = join(directory, "translations", "entry.en.po");
    const poContent = await readFile(poPath);
    const po = gettextParser.po.parse(poContent);

    const messages = Object.values(po.translations[""]).map((msg) => msg.msgid);

    assert.deepEqual(messages.sort(), ["", "Another message", "Hello world", "One file"]);
});
