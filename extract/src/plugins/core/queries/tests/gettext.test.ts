import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";

import { gettextInvalidQuery, gettextQuery } from "../gettext.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/gettext.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

test("should match snapshot", () => {
    expect(gettextQuery.pattern).toMatchSnapshot();
});

describe("should extract messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, gettextQuery);

            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            id: "hello",
                            message: ["hello"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
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
                            id: "Hello, ${name}!",
                            message: ["Hello, ${name}!"],
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
    }));

describe("should extract errors", () =>
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
    }));
