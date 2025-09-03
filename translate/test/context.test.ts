import assert from "node:assert/strict";
import { test } from "node:test";
import { context, message } from "../src/messages.ts";

test("context builder attaches context to message", () => {
    const verb = context("verb");
    assert.deepEqual(verb.message("Open"), {
        context: "verb",
        id: { msgid: "Open", msgstr: "Open" },
    });
});

test("context builder attaches context to plural", () => {
    const company = context("company");
    const p = company.plural(message`${0} apple`, message`${0} apples`, 2);
    assert.equal(p.context, "company");
    assert.equal(p.id.forms[0].msgstr, "${0} apple");
    assert.equal(p.id.forms[1].msgstr, "${0} apples");
});

test("context builder accepts template literals", () => {
    const fruit = context`fruit`;
    assert.deepEqual(fruit.message`apple`, {
        context: "fruit",
        id: { msgid: "apple", msgstr: "apple", values: [] },
    });
});

test("context builder rejects interpolations", () => {
    const category = "citrus";
    // @ts-expect-error context cannot contain expressions
    void context`fruit${category}`;
});
