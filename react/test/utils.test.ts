import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { buildTemplateFromChildren } from "../src/utils.ts";

test("buildTemplateFromChildren splits strings and values", () => {
    const child = createElement("b", null, "world");
    const { strings, values } = buildTemplateFromChildren(["Hello ", child, "!"]);
    assert.deepEqual(strings, ["Hello ", "!"]);
    assert.equal(values.length, 1);
});
