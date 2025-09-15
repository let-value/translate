import assert from "node:assert/strict";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import type { GetTextTranslationRecord } from "gettext-parser";
import { merge } from "./po.ts";

const date = new Date("2024-01-01T00:00:00Z");

function createExisting() {
    const po = gettextParser.po.compile({
        charset: "utf-8",
        headers: {},
        translations: {
            "": {
                "": { msgid: "", msgstr: [""] },
                hello: { msgid: "hello", msgstr: ["Hello"] },
            },
        },
    });
    return po.toString();
}

function runMerge(sources: GetTextTranslationRecord[], existing: string | undefined, strategy: "mark" | "remove") {
    return merge(
        sources.map((translations) => ({ translations })),
        existing,
        strategy,
        "en",
        date,
    );
}

test("marks missing translations as obsolete", () => {
    const existing = createExisting();
    const out = runMerge([], existing, "mark");
    const parsed = gettextParser.po.parse(out);
    assert.ok(parsed.obsolete?.[""]?.hello, "missing translation should be obsolete");
    assert.equal(parsed.translations[""]?.hello, undefined);
});

test("removes missing translations when strategy is remove", () => {
    const existing = createExisting();
    const out = runMerge([], existing, "remove");
    const parsed = gettextParser.po.parse(out);
    assert.equal(parsed.translations[""]?.hello, undefined);
    assert.equal(parsed.obsolete, undefined);
});
