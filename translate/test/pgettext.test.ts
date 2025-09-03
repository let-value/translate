import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context } from "../src/helpers.ts";
import { Translator } from "../src/translator.ts";

test("pgettext handles context-specific translations", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("ru", translations);
    assert.equal(t.pgettext("verb", "Open"), "Открыть");
    assert.equal(t.pgettext("adjective", "Open"), "Открытый");
});

test("gettext handles context-aware messages", async () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("en", translations);
    await t.useLocale("ru");
    const verb = context("verb");
    assert.equal(t.pgettext(verb.msg("Open")), "Открыть");
});

test("pgettext returns original string when translation missing", () => {
    const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
    const translations = { ru: gettextParser.po.parse(ruPo) };
    const t = new Translator("ru", translations);
    assert.equal(t.pgettext("verb", "Close"), "Close");
});
