import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as gettextParser from "gettext-parser";

import { parseFile } from "../../core/parse.ts";
import { collect, merge } from "../po.ts";

test("preserves existing translations and comments", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const existingPath = fileURLToPath(new URL("./fixtures/existing.po", import.meta.url));
    const existing = await fs.readFile(existingPath);

    const { translations } = parseFile(fixture);
    const record = collect(
        translations.map((t) => ({
            ...t,
            context: (t as any).context ?? (t as any).msgctxt,
        })),
        "en",
    );

    const out = merge(
        "en",
        [{ entrypoint: fixture, path: fixture, destination: "messages.po", translations: record }],
        existing,
        "mark",
        new Date(),
    );

    const parsed = gettextParser.po.parse(out);
    const message = parsed.translations[""]["Hello world"];

    assert.equal(message.msgstr[0], "Ahoy!");
    assert.equal(message.comments?.translator, "existing translator comment");
});
