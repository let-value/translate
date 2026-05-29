import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { importQuery } from "../import.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(new URL("./fixtures/imports.ts", import.meta.url)).toString();

const paths = ["test.js", "test.cjs", "test.mjs", "test.ts", "test.tsx"];

suite("should extract imports", () =>
    paths.forEach((path) => {
        test(path, () => {
            const matches = getMatches(fixture, path, importQuery);
            assert.deepEqual(
                matches.map((match) => match.spec),
                [
                    "default-export",
                    "named-export",
                    "namespace-export",
                    "side-effect",
                    "export-all",
                    "export-from",
                    "cjs-module",
                    "resolved-module",
                    "dynamic-import",
                    "async-import",
                ],
            );
        });
    }),
);

test("marks type-only and dynamic imports", () => {
    const matches = getMatches(
        `
import type { Props } from "./props";
export type { Model } from "./model";
export { type Shape } from "./shape";
import { type Label, value } from "./mixed";
import("./lazy");
`,
        "test.ts",
        importQuery,
    );

    assert.deepEqual(matches, [
        { spec: "./props", kind: "static", typeOnly: true },
        { spec: "./model", kind: "static", typeOnly: true },
        { spec: "./shape", kind: "static", typeOnly: true },
        { spec: "./mixed", kind: "static", typeOnly: false },
        { spec: "./lazy", kind: "dynamic", typeOnly: false },
    ]);
});
