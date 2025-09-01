import assert from "node:assert/strict";
import { test } from "node:test";

import { memo, pluralFunc, substitute } from "../src/utils.ts";

// substitute replacement behavior
test("substitute replaces placeholders with values", () => {
    assert.equal(
        substitute("Hello ${0}, ${1}!", ["World", "Friend"]),
        "Hello World, Friend!",
    );
});

// memo caching behavior
test("memo caches results for same inputs", () => {
    let calls = 0;
    const fn = memo((x: number) => {
        calls++;
        return x * 2;
    });

    assert.equal(fn(2), 4);
    assert.equal(fn(2), 4);
    assert.equal(calls, 1);
});

// pluralFunc default behavior for unknown locale
test("pluralFunc falls back to default when locale is unknown", () => {
    const pf = pluralFunc("xx");
    assert.equal(pf(1), 0);
    assert.equal(pf(2), 1);
});
