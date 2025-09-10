import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as gettextParser from "gettext-parser";
import { parseFile } from "../../core/parse.ts";
import { collect, merge } from "../po.ts";

function normalize(po: gettextParser.GetTextTranslations) {
    return Object.values(po.translations)
        .flatMap((ctx) => Object.values(ctx))
        .filter(({ msgid }) => msgid)
        .map(({ comments, ...rest }) => ({
            comments: { ...comments, flag: undefined, reference: undefined },
            ...rest,
        }));
}

test("matches xgettext output", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const refPath = fileURLToPath(new URL("./fixtures/xgettext.po", import.meta.url));
    const ref = gettextParser.po.parse(await fs.readFile(refPath));

    const { translations } = parseFile(fixture);
    const record = collect(translations, "en");
    const out = merge(
        [{ entrypoint: fixture, path: fixture, destination: "messages.po", translations: record }],
        undefined,
        "mark",
        "en",
        new Date(),
    );
    const ours = gettextParser.po.parse(out);

    assert.deepEqual(normalize(ours), normalize(ref));
});

test("matches xgettext output for 4 plural forms", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const refPath = fileURLToPath(new URL("./fixtures/xgettext-sl.po", import.meta.url));
    const ref = gettextParser.po.parse(await fs.readFile(refPath));

    const { translations } = parseFile(fixture);
    const record = collect(translations, "sl");
    const out = merge(
        [{ entrypoint: fixture, path: fixture, destination: "messages.po", translations: record }],
        undefined,
        "mark",
        "sl",
        new Date(),
    );
    const ours = gettextParser.po.parse(out);

    assert.deepEqual(normalize(ours), normalize(ref));
});
