import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { collect, merge } from "../po.ts";
import { parseFile } from "../../core/parse.ts";

test("matches xgettext output", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const refPath = fileURLToPath(new URL("./fixtures/xgettext.po", import.meta.url));
    const ref = gettextParser.po.parse(await fs.readFile(refPath));

    const { translations } = parseFile(fixture);
    const record = collect(
        translations.map((t) => ({
            ...t,
            context: (t as any).context ?? (t as any).msgctxt,
            message: t.message.map(() => ""),
        })),
    );
    const out = merge(
        "en",
        [{ entrypoint: fixture, path: fixture, destination: "messages.po", translations: record }],
        undefined,
        "mark",
        new Date(),
    );
    const ours = gettextParser.po.parse(out);

    function normalize(po: gettextParser.GetTextTranslations) {
        const result: Record<string, Record<string, unknown>> = {};
        for (const [ctx, msgs] of Object.entries(po.translations)) {
            for (const [id, msg] of Object.entries(msgs as Record<string, any>)) {
                if (id === "") continue;
                result[ctx] ??= {};
                result[ctx][id] = {
                    msgid: (msg as any).msgid,
                    msgid_plural: (msg as any).msgid_plural,
                    msgctxt: (msg as any).msgctxt,
                    msgstr: (msg as any).msgstr,
                };
            }
        }
        return result;
    }

    assert.deepEqual(normalize(ours), normalize(ref));
});
