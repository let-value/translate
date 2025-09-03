import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { messageInvalidQuery, messageQuery } from "../message.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/message.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, messageQuery);

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
                        error: "message() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: "message() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: undefined,
                        translation: {
                            msgid: "Hi, nested",
                            msgstr: ["Hi, nested"],
                        },
                    },
                ],
            );
        });
    }),
);

suite("should extract errors", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, messageInvalidQuery);

            assert.deepEqual(
                matches.map(({ error, translation }) => ({
                    error,
                    translation,
                })),
                [
                    {
                        error: "message() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                    {
                        error: "message() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                    {
                        error: "message() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);
