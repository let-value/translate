import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { msgQuery } from "../msg.ts";
import { ngettextQuery } from "../ngettext.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/ngettext.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract plural messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, ngettextQuery);

            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            msgid: "hello",
                            msgid_plural: "hellos",
                            msgstr: ["hello", "hellos"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "${count} apple",
                            msgid_plural: "${count} apples",
                            msgstr: ["${count} apple", "${count} apples"],
                            comments: {
                                extracted: "comment",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "greeting",
                            msgid_plural: "greetings",
                            msgstr: ["Hello, world!", "Hello, worlds!"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "Hello, ${name}!",
                            msgid_plural: "Hello, ${name}!",
                            msgstr: ["Hello, ${name}!", "Hello, ${name}!"],
                        },
                    },
                    {
                        error: "ngettext() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("msg query should ignore ngettext arguments", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, msgQuery);
            assert.equal(matches.length, 0);
        });
    }),
);
