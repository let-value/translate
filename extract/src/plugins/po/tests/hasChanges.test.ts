import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { parseFile } from "../../core/parse.ts";
import { collect } from "../collect.ts";
import { hasChanges } from "../hasChanges.ts";
import { merge } from "../merge.ts";

const baseTranslations: GetTextTranslations = {
    charset: "utf-8",
    headers: {
        "content-type": "text/plain; charset=UTF-8",
        "plural-forms": "nplurals=2; plural=(n != 1);",
        language: "en",
        "pot-creation-date": "2024-01-01 12:00+0000",
        "x-generator": "@let-value/translate-extract",
    },
    translations: {
        "": {
            "": {
                msgid: "",
                msgstr: [""],
            },
            Hello: {
                msgid: "Hello",
                msgstr: ["Hello"],
            },
            World: {
                msgid: "World",
                msgstr: ["World"],
                comments: {
                    reference: "file.ts:10",
                },
            },
        },
        button: {
            Save: {
                msgctxt: "button",
                msgid: "Save",
                msgstr: ["Save"],
            },
        },
    },
};

test("returns false for identical translations", () => {
    const result = hasChanges(baseTranslations, baseTranslations);
    assert.equal(result, false);
});

test("returns false for identical translations with different creation dates", () => {
    const newTranslations = {
        ...baseTranslations,
        headers: {
            ...baseTranslations.headers,
            "pot-creation-date": "2024-12-01 15:30+0000",
            "po-revision-date": "2024-12-01 15:30+0000",
        },
    };

    const oldTranslations = {
        ...baseTranslations,
        headers: {
            ...baseTranslations.headers,
            "pot-creation-date": "2024-01-01 12:00+0000",
            "po-revision-date": "2024-01-01 12:00+0000",
        },
    };

    const result = hasChanges(newTranslations, oldTranslations);
    assert.equal(result, false);
});

test("returns true when charset differs", () => {
    const newTranslations = {
        ...baseTranslations,
        charset: "iso-8859-1",
        headers: {
            ...baseTranslations.headers,
            "content-type": "text/plain; charset=ISO-8859-1",
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when headers differ (excluding ignored keys)", () => {
    const newTranslations = {
        ...baseTranslations,
        headers: {
            ...baseTranslations.headers,
            language: "es",
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when a translation message differs", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Hello: {
                    msgid: "Hello",
                    msgstr: ["Hola"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when a new translation is added", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Goodbye: {
                    msgid: "Goodbye",
                    msgstr: ["Goodbye"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when a translation is removed", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                "": baseTranslations.translations[""][""],
                Hello: baseTranslations.translations[""]["Hello"],
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when a new context is added", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            menu: {
                File: {
                    msgctxt: "menu",
                    msgid: "File",
                    msgstr: ["File"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when comments differ", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                World: {
                    msgid: "World",
                    msgstr: ["World"],
                    comments: {
                        reference: "file.ts:20",
                    },
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when obsolete translations differ", () => {
    const newTranslations = {
        ...baseTranslations,
        obsolete: {
            "": {
                "Old message": {
                    msgid: "Old message",
                    msgstr: ["Old message"],
                    obsolete: true,
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when msgid_plural differs", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                item: {
                    msgid: "item",
                    msgid_plural: "items",
                    msgstr: ["item", "items"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, true);
});

test("returns true when msgctxt differs", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            dialog: {
                Save: {
                    msgctxt: "dialog",
                    msgid: "Save",
                    msgstr: ["Save"],
                },
            },
        },
    };

    const { button: _, ...restTranslations } = baseTranslations.translations;
    const oldTranslations = {
        ...baseTranslations,
        translations: restTranslations,
    };

    const result = hasChanges(newTranslations, oldTranslations);
    assert.equal(result, true);
});

test("ignores properties explicitly set to undefined", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                    comments: undefined,
                },
            },
        },
    };

    const oldTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, oldTranslations);
    assert.equal(result, false);
});

test("treats null translator comments as no change", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                    comments: { translator: null },
                },
            },
        },
    };

    const oldTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, oldTranslations);
    assert.equal(result, false);
});

test("ignores empty nested structures", () => {
    const withEmptyComments = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                    comments: { translator: undefined },
                },
            },
        },
    };

    const withoutComments = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Test: {
                    msgid: "Test",
                    msgstr: ["Test"],
                },
            },
        },
    };

    const result = hasChanges(withEmptyComments, withoutComments);
    assert.equal(result, false);
});

test("ignores empty obsolete sections", () => {
    const withEmptyObsolete = {
        ...baseTranslations,
        obsolete: {},
    };

    const result = hasChanges(withEmptyObsolete, baseTranslations);
    assert.equal(result, false);
});

test("detects translator comment updates", () => {
    const baseWorld = baseTranslations.translations[""]?.World;
    const withTranslatorComment = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                World: {
                    ...baseWorld,
                    comments: {
                        ...baseWorld?.comments,
                        translator: "Jane Doe",
                    },
                },
            },
        },
    };

    const result = hasChanges(withTranslatorComment, baseTranslations);
    assert.equal(result, true);
});

test("ignores header key casing differences", () => {
    const newTranslations = {
        ...baseTranslations,
        headers: {
            ...baseTranslations.headers,
        },
    };

    if (newTranslations.headers) {
        delete newTranslations.headers["x-generator"];
        newTranslations.headers["X-Generator"] = baseTranslations.headers?.["x-generator"] ?? "";
    }

    const result = hasChanges(newTranslations, baseTranslations);
    assert.equal(result, false);
});

test("returns false when only empty message entries differ", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                "": {
                    msgid: "",
                    msgstr: ["Different empty string content"],
                },
            },
        },
    };

    const oldTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                "": {
                    msgid: "",
                    msgstr: [""],
                },
            },
        },
    };

    const result = hasChanges(newTranslations, oldTranslations);
    assert.equal(result, false);
});

test("handles deep cloned objects as identical", () => {
    const clonedTranslations = JSON.parse(JSON.stringify(baseTranslations));

    const result = hasChanges(clonedTranslations, baseTranslations);
    assert.equal(result, false);
});

test("returns false after regenerating from existing translations", () => {
    const fixture = fileURLToPath(new URL("./fixtures/sample.js", import.meta.url));
    const generatedAt = new Date("2024-01-01T00:00:00Z");

    const firstParse = parseFile(fixture);
    const firstCollected = collect(firstParse.translations, "en");
    const initial = merge([{ translations: firstCollected }], undefined, "mark", "en", generatedAt);

    const compiled = gettextParser.po.compile(initial);
    const existing = gettextParser.po.parse(compiled);

    const secondParse = parseFile(fixture);
    const secondCollected = collect(secondParse.translations, "en");
    const regenerated = merge([{ translations: secondCollected }], existing, "mark", "en", generatedAt);

    assert.notDeepStrictEqual(regenerated, existing);
    const result = hasChanges(regenerated, existing);
    assert.equal(result, false);
});
