import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as gettextParser from "gettext-parser";

import { parseFile } from "../../core/parse.ts";
import { collect } from "../collect.ts";
import { merge } from "../merge.ts";

test("preserves existing translations and comments", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const existingPath = fileURLToPath(new URL("./fixtures/existing.po", import.meta.url));
    const existing = gettextParser.po.parse(await fs.readFile(existingPath));

    const { translations } = parseFile(fixture);
    const record = collect(translations, "en");

    const merged = merge([{ translations: record }], existing, "mark", "en", new Date());
    const message = merged.translations[""]["Hello world"];

    assert.equal(message.msgstr[0], "Ahoy!");
    assert.equal(message.comments?.translator, "existing translator comment");
});
