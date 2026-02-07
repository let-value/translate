import assert from "node:assert";
import { test } from "node:test";

import * as expected from "@let-value/translate-extract";
import * as actual from "../src/index.ts";

const omitted = ["run"] as const;
type OmittedApi = (typeof omitted)[number];
type ExpectedApi = keyof Omit<typeof expected, OmittedApi> & {};
type ActualApi = keyof typeof actual & {};

test("static api equal", () => {
    assert.deepStrictEqual(
        Object.keys(actual).sort(),
        Object.keys(expected)
            .filter((key) => !omitted.includes(key as OmittedApi))
            .sort(),
    );
});

type AssertEqual<T, Expected> = [T] extends [Expected] ? ([Expected] extends [T] ? true : false) : false;

export const _typeCheck: AssertEqual<ActualApi, ExpectedApi> = true;
