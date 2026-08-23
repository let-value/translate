import assert from "node:assert/strict";
import { test } from "vite-plus/test";

import type { Translation } from "../../core/queries/types.ts";
import { collect } from "../collect.ts";
import { merge } from "../merge.ts";

test("initializes default-locale msgstr from Translation.message", () => {
    const translations: Translation[] = [
        { id: "library.exercise.foo.instructions", message: ["Set your stance.\nLift the bar."] },
    ];

    const record = collect(translations, "en", "en");

    assert.deepEqual(record[""]["library.exercise.foo.instructions"].msgstr, ["Set your stance.\nLift the bar."]);
});

test("leaves non-default-locale msgstr empty", () => {
    const translations: Translation[] = [
        { id: "library.exercise.foo.instructions", message: ["Set your stance.\nLift the bar."] },
    ];

    const record = collect(translations, "fr", "en");

    assert.deepEqual(record[""]["library.exercise.foo.instructions"].msgstr, [""]);
});

test("preserves an existing default-locale msgstr on subsequent extraction", () => {
    const translations: Translation[] = [
        { id: "library.exercise.foo.instructions", message: ["Set your stance.\nLift the bar."] },
    ];

    const record = collect(translations, "en", "en");
    const merged = merge(
        [{ translations: record }],
        {
            charset: "utf-8",
            headers: {},
            translations: {
                "": {
                    "": { msgid: "", msgstr: [""] },
                    "library.exercise.foo.instructions": {
                        msgid: "library.exercise.foo.instructions",
                        msgstr: ["Translator-edited stance instructions."],
                    },
                },
            },
        },
        "mark",
        "en",
        new Date(),
    );

    assert.equal(
        merged.translations[""]["library.exercise.foo.instructions"].msgstr[0],
        "Translator-edited stance instructions.",
    );
});
