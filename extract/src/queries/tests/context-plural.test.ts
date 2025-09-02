import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { contextPluralQuery } from "../context.ts";
import { msgQuery } from "../msg.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/context-plural.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract context builder plural messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, contextPluralQuery);
            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            msgid: "hello",
                            msgid_plural: "hellos",
                            msgstr: ["hello", "hellos"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "company",
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
                            msgctxt: "ctx",
                            msgid: "greeting",
                            msgid_plural: "greetings",
                            msgstr: ["Hello, world!", "Hello, worlds!"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            msgid: "Hello, ${name}!",
                            msgid_plural: "Hello, ${name}!",
                            msgstr: ["Hello, ${name}!", "Hello, ${name}!"],
                        },
                    },
                    {
                        error: "context.plural() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("msg query should ignore context plural arguments", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, msgQuery);
            assert.equal(matches.length, 0);
        });
    }),
);
