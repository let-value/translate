import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { messageQuery } from "../message.ts";
import { pluralQuery } from "../plural.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/plural.ts", import.meta.url)).toString();

const paths = ["test.js", "test.jsx", "test.ts", "test.tsx"];

suite("should extract plural messages", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, pluralQuery);

            assert.deepEqual(
                matches.map(({ translation, error }) => ({ translation, error })),
                [
                    {
                        error: undefined,
                        translation: {
                            id: "hello",
                            plural: "hellos",
                            message: ["hello", "hellos"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
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
                            id: "greeting",
                            plural: "greetings",
                            message: ["Hello, world!", "Hello, worlds!"],
                        },
                    },
                    {
                        error: undefined,
                        translation: {
                            id: "Hello, ${name}!",
                            plural: "Hello, ${name}!",
                            message: ["Hello, ${name}!", "Hello, ${name}!"],
                        },
                    },
                    {
                        error: "plural() template expressions must be simple identifiers",
                        translation: undefined,
                    },
                ],
            );
        });
    }),
);

suite("message query should ignore plural arguments", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, messageQuery);
            assert.equal(matches.length, 0);
        });
    }),
);
