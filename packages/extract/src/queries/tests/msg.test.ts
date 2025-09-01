import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { msgDescriptorQuery, msgInvalidQuery, msgStringQuery, msgTemplateQuery } from "../msg.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/msg.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract string message", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, msgStringQuery);
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
            const matches = getMatches(fixture, path, msgDescriptorQuery);

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
            const matches = getMatches(fixture, path, msgTemplateQuery);

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
                        error: "msg() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: "msg() template expressions must be simple identifiers",
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
            const matches = getMatches(fixture, path, msgInvalidQuery);

            assert.deepEqual(
                matches.map(({ error, translation }) => ({
                    error,
                    translation,
                })),
                [
                    {
                        error: "msg() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                    {
                        error: "msg() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                    {
                        error: "msg() argument must be a string literal, object literal, or template literal",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);
