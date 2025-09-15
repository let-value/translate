import assert from "node:assert/strict";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import type { Translation } from "../../core/queries/types.ts";
import { collect, merge } from "../po.ts";

test("deduplicates messages and preserves references", () => {
    const translationsA: Translation[] = [
        { id: "Hello", message: ["Hello"], comments: { reference: "a.js:1:1" } },
        { id: "Hello", message: ["Hello"], comments: { reference: "a.js:2:1" } },
    ];
    const translationsB: Translation[] = [{ id: "Hello", message: ["Hello"], comments: { reference: "b.js:1:1" } }];

    const recA = collect(translationsA, "en");
    const recB = collect(translationsB, "en");

    const out = merge(
        [
            { translations: recA },
            { translations: recB },
        ],
        undefined,
        "mark",
        "en",
        new Date(),
    );

    const parsed = gettextParser.po.parse(out);
    const entry = parsed.translations[""].Hello;
    assert.ok(entry);
    const refs = entry.comments?.reference?.split(/\r?\n|\r/).sort();
    assert.deepEqual(refs, ["a.js:1:1", "a.js:2:1", "b.js:1:1"].sort());
});
