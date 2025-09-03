import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

test("context builder handles context-specific translations", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("ru", translations);
    assert.equal(t.context("verb").message("Open"), "Открыть");
    assert.equal(t.context("adjective").message("Open"), "Открытый");
});

test("context builder handles context-aware messages", async () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("en", translations);
    await t.useLocale("ru");
    const verb = context("verb");
    assert.equal(t.context("verb").message(verb.message("Open")), "Открыть");
});

test("context message returns original string when translation missing", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("ru", translations);
    assert.equal(t.context("verb").message("Close"), "Close");
});

test("pgettext alias works", () => {
    const t = new Translator("en", {});
    assert.equal(t.pgettext("ctx", "X"), "X");
});

test("translator context accepts template literals", () => {
    const t = new Translator("en", {});
    assert.equal(t.context`verb`.message`Open`, "Open");
});

test("translator context rejects interpolations", () => {
    const t = new Translator("en", {});
    const category = "test";
    // @ts-expect-error context cannot contain expressions
    void t.context`fruit${category}`;
});
