import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

test("context builder handles context-specific translations", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const t = new Translator({ ru: gettextParser.po.parse(ruPo) }).getLocale("ru");
    assert.equal(t.context("verb").message("Open"), "Открыть");
    assert.equal(t.context("adjective").message("Open"), "Открытый");
});

test("context builder handles context-aware messages", async () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const t = new Translator({ ru: gettextParser.po.parse(ruPo) }).getLocale("ru");
    const verb = context("verb");
    assert.equal(t.translate(verb.message("Open")), "Открыть");
});

test("context message returns original string when translation missing", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const t = new Translator({ ru: gettextParser.po.parse(ruPo) }).getLocale("ru");
    assert.equal(t.context("verb").message("Close"), "Close");
});

test("context message rejects deferred input", () => {
    const t = new Translator({}).getLocale("en" as never);
    const verb = context("verb");
    const deferred = verb.message("Open");
    assert.throws(() => {
        // @ts-expect-error context message does not accept deferred inputs
        t.context("verb").message(deferred);
    }, /translate\(\)/);
});

test("pgettext alias works", () => {
    const t = new Translator({}).getLocale("en" as never);
    assert.equal(t.pgettext("ctx", "X"), "X");
});

test("translator context accepts template literals", () => {
    const t = new Translator({}).getLocale("en" as never);
    assert.equal(t.context`verb`.message`Open`, "Open");
});

test("translator context rejects interpolations", () => {
    const t = new Translator({}).getLocale("en" as never);
    const category = "test";
    // @ts-expect-error context cannot contain expressions
    void t.context`fruit${category}`;
});
