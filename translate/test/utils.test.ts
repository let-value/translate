import assert from "node:assert/strict";
import { test } from "node:test";

import type { Locale } from "../src/config.ts";
import { memo, normalizeMessageId, pluralFunc, substitute } from "../src/utils.ts";

test("substitute replaces numeric placeholders with values", () => {
    assert.equal(substitute("Hello ${0}, ${1}!", ["World", "Friend"]), "Hello World, Friend!");
    assert.equal(substitute("${0} has ${1} items", [5, 10]), "5 has 10 items");
});

test("substitute replaces named placeholders with values", () => {
    assert.equal(substitute("Hello ${name}!", ["World"]), "Hello World!");
    assert.equal(substitute("${user} has ${count} items", ["Alice", 5]), "Alice has 5 items");
});

test("substitute handles mixed named and numeric placeholders", () => {
    assert.equal(substitute("Hello ${name}, you have ${1} messages", ["Bob", 3]), "Hello Bob, you have 3 messages");
});

test("substitute handles repeated placeholders", () => {
    assert.equal(substitute("${name} says hello to ${name}", ["Alice"]), "Alice says hello to Alice");
    assert.equal(substitute("${user} gave ${count} items to ${user}", ["Bob", 5]), "Bob gave 5 items to Bob");
});

test("substitute preserves placeholders when no values provided", () => {
    assert.equal(substitute("Hello ${name}!", []), "Hello ${name}!");
    assert.equal(substitute("Hello ${0}!", []), "Hello ${0}!");
});

test("substitute preserves placeholders when insufficient values", () => {
    assert.equal(substitute("Hello ${name}, ${greeting}!", ["World"]), "Hello World, ${greeting}!");
    assert.equal(substitute("Hello ${0}, ${1}!", ["World"]), "Hello World, ${1}!");
});

test("substitute handles empty values and edge cases", () => {
    assert.equal(substitute("", ["value"]), "");
    assert.equal(substitute("No placeholders", ["value"]), "No placeholders");
    assert.equal(substitute("${}", ["value"]), "${}");
    assert.equal(substitute("${invalid", ["value"]), "${invalid");
});

test("substitute handles Japanese text with placeholders", () => {
    assert.equal(substitute("こんにちは、${name}！", ["World"]), "こんにちは、World！");
    assert.equal(substitute("${count} りんご", [5]), "5 りんご");
});

test("normalizeMessageId preserves messages without placeholders", () => {
    assert.equal(normalizeMessageId("Hello world"), "Hello world");
});

test("normalizeMessageId preserves numeric placeholders", () => {
    assert.equal(normalizeMessageId("Hello ${0}!"), "Hello ${0}!");
    assert.equal(normalizeMessageId("${0} has ${1} items"), "${0} has ${1} items");
});

test("normalizeMessageId converts named placeholders to numeric", () => {
    assert.equal(normalizeMessageId("Hello ${name}!"), "Hello ${0}!");
    assert.equal(normalizeMessageId("${user} has ${count} items"), "${0} has ${1} items");
});

test("normalizeMessageId handles mixed named and numeric placeholders", () => {
    assert.equal(normalizeMessageId("Hello ${name}, you have ${1} messages"), "Hello ${0}, you have ${1} messages");
});

test("normalizeMessageId assigns consistent numbers to repeated placeholders", () => {
    assert.equal(normalizeMessageId("${name} says hello to ${name}"), "${0} says hello to ${0}");
    assert.equal(normalizeMessageId("${user} gave ${count} items to ${user}"), "${0} gave ${1} items to ${0}");
});

test("normalizeMessageId handles complex messages", () => {
    assert.equal(
        normalizeMessageId("Welcome ${name}! You have ${count} new messages and ${0} old ones."),
        "Welcome ${0}! You have ${1} new messages and ${0} old ones.",
    );
});

test("normalizeMessageId handles Japanese characters and placeholders", () => {
    assert.equal(normalizeMessageId("こんにちは、${name}！"), "こんにちは、${0}！");
    assert.equal(normalizeMessageId("${count} りんご"), "${0} りんご");
});

test("normalizeMessageId handles empty and edge cases", () => {
    assert.equal(normalizeMessageId(""), "");
    assert.equal(normalizeMessageId("${}"), "${}");
    assert.equal(normalizeMessageId("${"), "${");
    assert.equal(normalizeMessageId("text ${ invalid } text"), "text ${0} text");
});

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

test("pluralFunc falls back to default when locale is unknown", () => {
    const pf = pluralFunc("xx" as unknown as Locale);
    assert.equal(pf(1), 0);
    assert.equal(pf(2), 1);
});
