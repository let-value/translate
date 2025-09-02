import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { gettextInvalidQuery, gettextQuery } from "../gettext.ts";
import { msgQuery } from "../msg.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/gettext.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

test("should match snapshot", (t) => {
    const query = gettextQuery.pattern;
    t.assert.snapshot(query);
});

suite("should extract messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextQuery);

            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            msgid: "hello",
                            msgstr: ["hello"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "hello comment",
                            msgstr: ["hello comment"],
                            comments: {
                                extracted: "comment",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "greeting",
                            msgstr: ["Hello, world!"],
                            comments: {
                                extracted: "descriptor",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "greeting",
                            msgstr: ["Hello, world!"],
                            comments: {
                                extracted: "multiline\ncomment",
                            },
                        },
                    },
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
            const msgMatches = getMatches(source, path, msgQuery);
            const gettextMatches = getMatches(source, path, gettextQuery);
            const invalidMatches = getMatches(source, path, gettextInvalidQuery);
            assert.equal(msgMatches.length, 0);
            assert.equal(gettextMatches.length, 1);
            assert.equal(invalidMatches.length, 0);
        });
    }),
);
