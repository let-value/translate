import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { contextPluralQuery } from "../context.ts";
import { messageQuery } from "../message.ts";
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
                            context: "ctx",
                            id: "hello",
                            plural: "hellos",
                            message: ["hello", "hellos"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            context: "company",
                            id: "${count} apple",
                            plural: "${count} apples",
                            message: ["${count} apple", "${count} apples"],
                            comments: {
                                extracted: "comment",
                            },
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            context: "ctx",
                            id: "greeting",
                            plural: "greetings",
                            message: ["Hello, world!", "Hello, worlds!"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            context: "ctx",
                            id: "Hello, ${name}!",
                            plural: "Hello, ${name}!",
                            message: ["Hello, ${name}!", "Hello, ${name}!"],
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

suite("message query should ignore context plural arguments", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, messageQuery);
            assert.equal(matches.length, 0);
        });
    }),
);
