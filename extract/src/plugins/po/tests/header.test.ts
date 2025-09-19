import assert from "node:assert/strict";
import { test } from "node:test";
import { type Collected, formatDate, merge } from "../merge.ts";

test("sets POT-Creation-Date header from context timestamp", () => {
    const timestamp = new Date("2023-01-02T03:04:00Z");
    const collected: Collected[] = [{ translations: { "": {} } }];
    const merged = merge(collected, undefined, "mark", "en", timestamp);
    assert.equal(merged.headers["pot-creation-date"], formatDate(timestamp));
});
