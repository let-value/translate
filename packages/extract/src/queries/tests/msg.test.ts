import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
    msgDescriptorQuery,
    msgStringQuery,
    msgTemplateQuery,
} from "../msg.ts";
import { getMatches } from "./utils.ts";

const fixture = readFileSync(
    new URL("./fixtures/msg.ts", import.meta.url),
).toString();

test("should extract string message", () => {
    const matches = getMatches(fixture, msgStringQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [
        {
            msgid: "hello",
            msgstr: ["hello"],
        },
    ]);
});

test("should extract descriptor message", () => {
    const matches = getMatches(fixture, msgDescriptorQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [
        {
            msgid: "greeting",
            msgstr: ["Hello, world!"],
        },
    ]);
});

test("should extract template message", () => {
    const matches = getMatches(fixture, msgTemplateQuery);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches, [
        {
            msgid: "Hello, ${name}!",
            msgstr: ["Hello, ${name}!"],
        },
    ]);
});
