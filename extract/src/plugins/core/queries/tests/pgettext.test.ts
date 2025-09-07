import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { pgettextQuery } from "../pgettext.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/pgettext.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract context messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, pgettextQuery);
            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            id: "hello",
                            message: ["hello"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            id: "hello comment",
                            message: ["hello comment"],
                            comments: {
                                extracted: "comment",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            id: "greeting",
                            message: ["Hello, world!"],
                            comments: {
                                extracted: "descriptor",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            id: "greeting",
                            message: ["Hello, world!"],
                            comments: {
                                extracted: "multiline\ncomment",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            msgctxt: "ctx",
                            id: "Hello, ${name}!",
                            message: ["Hello, ${name}!"],
                        },
                    },
                    {
                        error: "pgettext() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: "pgettext() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);
