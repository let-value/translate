import assert from "node:assert/strict";
import { test } from "node:test";
import type { GetTextTranslationRecord, GetTextTranslations } from "gettext-parser";

import { merge } from "../merge.ts";

const date = new Date("2024-01-01T00:00:00Z");

function createExisting() {
    return {
        charset: "utf-8",
        headers: {},
        translations: {
            "": {
                "": { msgid: "", msgstr: [""] },
                hello: { msgid: "hello", msgstr: ["Hello"] },
            },
        },
    };
}

function runMerge(
    sources: GetTextTranslationRecord[],
    existing: GetTextTranslations | undefined,
    strategy: "mark" | "remove",
) {
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
    const merged = runMerge([], existing, "mark");
    assert.ok(merged.obsolete?.[""]?.hello, "missing translation should be obsolete");
    assert.equal(merged.translations[""]?.hello, undefined);
});

test("removes missing translations when strategy is remove", () => {
    const existing = createExisting();
    const merged = runMerge([], existing, "remove");
    assert.equal(merged.translations[""]?.hello, undefined);
    assert.equal(merged.obsolete, undefined);
});
