import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { buildMessageFromChildren } from "../src/utils.ts";

test("buildMessageFromChildren splits id and values", () => {
    const child = createElement("b", null, "world");
    const { id, values } = buildMessageFromChildren(["Hello ", child, "!"]);
    assert.equal(id, "Hello ${0}!");
    assert.equal(values.length, 1);
});
