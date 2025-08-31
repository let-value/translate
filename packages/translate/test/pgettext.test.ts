import { test } from "node:test";
import assert from "node:assert/strict";
import { context } from "../src/helpers.ts";
import { Translator } from "../src/translator.ts";
import fs from "node:fs";
import * as gettextParser from "gettext-parser";

test("pgettext handles context-specific translations", () => {
	const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
	const translations = { ru: gettextParser.po.parse(ruPo) };
	const t = new Translator("ru", translations);
	assert.equal(t.pgettext("verb", "Open"), "Открыть");
	assert.equal(t.pgettext("adjective", "Open"), "Открытый");
});

test("gettext handles context-aware messages", () => {
	const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
	const translations = { ru: gettextParser.po.parse(ruPo) };
	const t = new Translator("en", translations);
	t.useLocale("ru");
	const verb = context("verb");
	assert.equal(t.pgettext(verb.msg("Open")), "Открыть");
});

test("pgettext returns original string when translation missing", () => {
	const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
	const translations = { ru: gettextParser.po.parse(ruPo) };
	const t = new Translator("ru", translations);
	assert.equal(t.pgettext("verb", "Close"), "Close");
});
