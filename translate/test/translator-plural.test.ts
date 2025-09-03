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
};

test("plural handles English plurals", () => {
    const t = new Translator("en", translations);
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 apple");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 apples");
});

test("plural handles Russian plurals", async () => {
    const t = new Translator("en", translations);
    await t.useLocale("ru");
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 яблоко");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 яблока");
    assert.equal(t.plural(message`${5} apple`, message`${5} apples`, 5), "5 яблок");
});

test("plural supports plural helper", () => {
    const t = new Translator("en", translations);
    const apples = plural(message`${1} apple`, message`${1} apples`, 1);
    assert.equal(t.plural(apples), "1 apple");
});

test("plural supports plural helper with multiple forms", () => {
    const t = new Translator("ru", translations);
    const apples = plural(message`${5} apple`, message`${5} apples`, message`${5} many apples`, 5);
    assert.equal(t.plural(apples), "5 яблок");
});

test("plural substitutes values from the chosen plural form", () => {
    const t = new Translator("en", translations);
    assert.equal(t.plural(message`${"Bob"} ${1} carrot`, message`${2} carrots for ${"Bob"}`, 1), "Bob 1 carrot");
    assert.equal(t.plural(message`${"Bob"} ${1} carrot`, message`${2} carrots for ${"Bob"}`, 2), "2 carrots for Bob");
});

test("context handles plurals", () => {
    const t = new Translator("ru", translations);
    assert.equal(
        t.context("company").plural(message`${1} apple`, message`${1} apples`, 1),
        "1 Apple устройство",
    );
    assert.equal(
        t.context("company").plural(message`${2} apple`, message`${2} apples`, 2),
        "2 Apple устройства",
    );
});

test("context-aware plural helper works", () => {
    const t = new Translator("ru", translations);
    const apples = context("company").plural(message`${2} apple`, message`${2} apples`, 2);
    assert.equal(t.context("company").plural(apples), "2 Apple устройства");
});

test("plural returns default forms when translation missing", async () => {
    const t = new Translator("en", {});
    await t.useLocale("fr");
    assert.equal(t.plural(message`${1} apple`, message`${1} apples`, 1), "1 apple");
    assert.equal(t.plural(message`${2} apple`, message`${2} apples`, 2), "2 apples");
});

test("ngettext alias works", () => {
    const t = new Translator("en", translations);
    assert.equal(t.ngettext(message`${1} apple`, message`${1} apples`, 1), "1 apple");
});
