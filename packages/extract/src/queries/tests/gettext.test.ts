import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import {
    gettextDescriptorQuery,
    gettextInvalidQuery,
    gettextStringQuery,
    gettextTemplateQuery,
} from "../gettext.ts";
import { msgTemplateQuery } from "../msg.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/gettext.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract string message", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextStringQuery);
            const translations = matches.map(({ translation }) => translation);

            assert.equal(translations.length, 2);
            assert.deepEqual(translations, [
                {
                    msgid: "hello",
                    msgstr: ["hello"],
                },
                {
                    msgid: "hello comment",
                    msgstr: ["hello comment"],
                    comments: {
                        extracted: "comment",
                    },
                },
            ]);
        });
    }),
);

suite("should extract descriptor message", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextDescriptorQuery);

            assert.equal(matches.length, 2);
            assert.deepEqual(
                matches.map(({ translation }) => translation),
                [
                    {
                        msgid: "greeting",
                        msgstr: ["Hello, world!"],
                        comments: {
                            extracted: "descriptor",
                        },
                    },
                    {
                        msgid: "greeting",
                        msgstr: ["Hello, world!"],
                        comments: {
                            extracted: "multiline\ncomment",
                        },
                    },
                ],
            );
        });
    }),
);

suite("should extract template message", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextTemplateQuery);

            assert.equal(matches.length, 3);
            assert.deepEqual(
                matches.map(({ translation, error }) => ({
                    error,
                    translation,
                })),
                [
                    {
                        error: undefined,
                        translation: {
                            msgid: "Hello, ${name}!",
                            msgstr: ["Hello, ${name}!"],
                        },
                    },
                    {
                        error: "gettext() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: "gettext() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("should extract errors", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextInvalidQuery);

            assert.deepEqual(
                matches.map(({ error, translation }) => ({
                    error,
                    translation,
                })),
                [
                    {
                        error: "gettext() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("should handle combined usage with msg", () =>
    paths.forEach((path) => {
        test(path, () => {
            const source = `import { msg } from "@let-value/translate";\nconst t = { gettext: (v) => v };\nconst name = "World";\nt.gettext(msg\`Hello, \${name}!\`);`;
            const msgMatches = getMatches(source, path, msgTemplateQuery);
            const gettextMatches = getMatches(source, path, gettextTemplateQuery);
            const invalidMatches = getMatches(source, path, gettextInvalidQuery);
            assert.equal(msgMatches.length, 0);
            assert.equal(gettextMatches.length, 1);
            assert.equal(invalidMatches.length, 0);
        });
    }),
);
