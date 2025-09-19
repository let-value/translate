import assert from "node:assert/strict";
import { test } from "node:test";
import type { GetTextTranslations } from "gettext-parser";
import { hasChanges } from "../po.ts";

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

test("returns true when msgstr array length differs", () => {
    const newTranslations = {
        ...baseTranslations,
        translations: {
            ...baseTranslations.translations,
            "": {
                ...baseTranslations.translations[""],
                Hello: {
                    msgid: "Hello",
                    msgstr: ["Hello", "Hellos"],
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

test("handles null and undefined values", () => {
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
    assert.equal(result, true);
});

test("handles deep cloned objects as identical", () => {
    const clonedTranslations = JSON.parse(JSON.stringify(baseTranslations));

    const result = hasChanges(clonedTranslations, baseTranslations);
    assert.equal(result, false);
});
