import assert from "node:assert/strict";
import { test } from "node:test";

import { message } from "../src/messages.ts";

test("message with string returns id and message", () => {
    assert.deepEqual(message("hello"), { msgid: "hello", msgstr: "hello" });
});

test("message with descriptor uses id and message", () => {
    const descriptor = { id: "greeting", message: "Hello world" };
    assert.deepEqual(message(descriptor), {
        msgid: "greeting",
        msgstr: "Hello world",
    });
});

test("message with descriptor id only uses it for message too", () => {
    const descriptor = { id: "onlyId" };
    assert.deepEqual(message(descriptor), { msgid: "onlyId", msgstr: "onlyId" });
});

test("message with descriptor message only uses it for id too", () => {
    const descriptor = { message: "onlyMessage" };
    assert.deepEqual(message(descriptor), {
        msgid: "onlyMessage",
        msgstr: "onlyMessage",
    });
});

test("message with template string returns placeholders and values", () => {
    const name = "World";
    assert.deepEqual(message`Hello, ${name}!`, {
        msgid: "Hello, ${0}!",
        msgstr: "Hello, ${0}!",
        values: [name],
    });
});

test("message disallows computed strings", () => {
    const variable: string = "v";
    // @ts-expect-error computed strings are not allowed
    // biome-ignore lint/style/useTemplate: true
    message("Computed" + variable + "string");
});

test("message disallows variables", () => {
    // biome-ignore lint/style/useConst: true
    let name = "World";
    // @ts-expect-error dynamic template strings are not allowed
    message(name);
});
