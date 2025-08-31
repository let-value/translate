import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context, msg } from "../src/helpers.ts";
import { Translator } from "../src/translator.ts";

function load(locale: string) {
	const po = fs.readFileSync(
		new URL(`./fixtures/${locale}.po`, import.meta.url),
	);
	return gettextParser.po.parse(po);
}

const translations = {
	en: load("en"),
	ru: load("ru"),
};

test("ngettext handles context-aware message pairs", () => {
	const t = new Translator("ru", translations);
	assert.equal(
		t.npgettext("company", msg`${1} apple`, msg`${1} apples`, 1),
		"1 Apple устройство",
	);
	assert.equal(
		t.npgettext("company", msg`${2} apple`, msg`${2} apples`, 2),
		"2 Apple устройства",
	);
});

test("pgettext and npgettext accept context-aware messages", () => {
	const t = new Translator("ru", translations);
	const verb = context("verb");
	assert.equal(t.pgettext(verb.msg("Open")), "Открыть");
	const apples = context("company").plural(
		msg`${3} apple`,
		msg`${3} apples`,
		3,
	);
	assert.equal(t.npgettext(apples), "3 Apple устройства");
});

test("npgettext substitutes values from the chosen plural form", () => {
	const t = new Translator("en", translations);
	assert.equal(
		t.npgettext("ctx", msg`${1} apple`, msg`${2} apples for ${"Bob"}`, 1),
		"1 apple",
	);
	assert.equal(
		t.npgettext("ctx", msg`${1} apple`, msg`${2} apples for ${"Bob"}`, 2),
		"2 apples for Bob",
	);
});

test("npgettext returns default forms when translation missing", () => {
	const t = new Translator("ru", translations);
	assert.equal(
		t.npgettext("company", msg`${1} pear`, msg`${1} pears`, 1),
		"1 pear",
	);
	assert.equal(
		t.npgettext("company", msg`${2} pear`, msg`${2} pears`, 2),
		"2 pears",
	);
});
