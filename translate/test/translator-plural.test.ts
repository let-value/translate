import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context, message, plural } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

function load(locale: string) {
    const po = fs.readFileSync(new URL(`./fixtures/${locale}.po`, import.meta.url));
    return gettextParser.po.parse(po);
}

const translations = {
    en: load("en"),
    ru: load("ru"),
    ja: load("ja"),
    sk: load("sk"),
};

test("plural handles English plurals", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 apple");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 apples");
});

test("plural handles Russian plurals", async () => {
    const t = new Translator(translations).getLocale("ru");
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 яблоко");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 яблока");
    assert.equal(t.plural(message`${5} apple`, message`${5} apples`, 5), "5 яблок");
});

test("plural handles Japanese singular form for any number", () => {
    const t = new Translator(translations).getLocale("ja");
    for (const n of [0, 1, 2, 5]) {
        assert.equal(t.plural(message`${n} apple`, message`${n} apples`, n), "りんご");
    }
});

test("plural handles Slovak plurals for any number", () => {
    const t = new Translator(translations).getLocale("sk");
    for (let n = 0; n < 200; n++) {
        const expected = n === 1 ? `${n} jablko` : n >= 2 && n <= 4 ? `${n} jablká` : `${n} jabĺk`;
        assert.equal(t.plural(message`${n} apple`, message`${n} apples`, n), expected);
    }
});

test("translate handles plural helper", () => {
    const t = new Translator(translations).getLocale("en");
    const apples = plural(message`${1} apple`, message`${1} apples`, 1);
    assert.equal(t.translate(apples), "1 apple");
});

test("translate handles plural helper with multiple forms", () => {
    const t = new Translator(translations).getLocale("ru");
    const apples = plural(message`${5} apple`, message`${5} apples`, message`${5} many apples`, 5);
    assert.equal(t.translate(apples), "5 яблок");
});

test("plural warns and translates deferred plural input", () => {
    const t = new Translator(translations).getLocale("en");
    const apples = plural(message`${1} apple`, message`${1} apples`, 1);
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    try {
        // @ts-expect-error plural does not accept deferred inputs
        assert.equal(t.plural(apples), "1 apple");
    } finally {
        console.warn = originalWarn;
    }

    assert.ok(warnings.some((entry) => String(entry).includes("LocaleTranslator.plural")));
});

test("plural substitutes values from the chosen plural form", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.plural(message`${"Bob"} ${1} carrot`, message`${2} carrots for ${"Bob"}`, 1), "Bob 1 carrot");
    assert.equal(t.plural(message`${"Bob"} ${1} carrot`, message`${2} carrots for ${"Bob"}`, 2), "2 carrots for Bob");
});

test("context handles plurals", () => {
    const t = new Translator(translations).getLocale("ru");
    assert.equal(t.context("company").plural(message`${1} apple`, message`${1} apples`, 1), "1 Apple устройство");
    assert.equal(t.context("company").plural(message`${2} apple`, message`${2} apples`, 2), "2 Apple устройства");
});

test("translate handles context-aware plural helper", () => {
    const t = new Translator(translations).getLocale("ru");
    const apples = context("company").plural(message`${2} apple`, message`${2} apples`, 2);
    assert.equal(t.translate(apples), "2 Apple устройства");
});

test("plural returns default forms when translation missing", async () => {
    const t = new Translator({}).getLocale("fr" as never);
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 apple");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 apples");
});

test("ngettext alias works", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.ngettext(message`${1} apple`, message`${1} apples`, 1), "1 apple");
});
