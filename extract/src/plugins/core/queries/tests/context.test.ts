import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { contextInvalidQuery, contextMsgQuery } from "../context.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/context.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract context builder messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, contextMsgQuery);
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
                        error: "context.message() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                    {
                        error: "context.message() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("should extract context builder errors", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, contextInvalidQuery);
            assert.deepEqual(
                matches.map(({ error, translation }) => ({ error, translation })),
                [
                    {
                        error: "context() must be used with message() or plural() in the same expression",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);
