import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { msg } from "../src/helpers.ts";
import { Translator } from "../src/translator.ts";

test("translator substitutes template values", () => {
	const name = "World";
	const t = new Translator("en", {});
	assert.equal(t.gettext(msg`Hello, ${name}!`), "Hello, World!");
});

test("translator applies translations with placeholders", () => {
	const name = "World";
	const ruPo = fs.readFileSync(new URL("./fixtures/ru.po", import.meta.url));
	const translations = { ru: gettextParser.po.parse(ruPo) };
	const t = new Translator("en", translations);
	t.useLocale("ru");
	assert.equal(t.gettext`Hello, ${name}!`, "Привет, World!");
});

test("gettext returns original string when translation missing", () => {
	const t = new Translator("en", {});
	t.useLocale("fr");
	assert.equal(t.gettext(msg`Untranslated`), "Untranslated");
});
