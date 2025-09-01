import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context, msg, plural } from "../src/helpers.ts";
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

test("ngettext handles English plurals", () => {
    const t = new Translator("en", translations);
    assert.equal(t.ngettext(msg`${1} apple`, msg`${1} apples`, 1), "1 apple");
    assert.equal(t.ngettext(msg`${2} apple`, msg`${2} apples`, 2), "2 apples");
});

test("ngettext handles Russian plurals", () => {
    const t = new Translator("en", translations);
    t.useLocale("ru");
    assert.equal(t.ngettext(msg`${1} apple`, msg`${1} apples`, 1), "1 яблоко");
    assert.equal(t.ngettext(msg`${2} apple`, msg`${2} apples`, 2), "2 яблока");
    assert.equal(t.ngettext(msg`${5} apple`, msg`${5} apples`, 5), "5 яблок");
});

test("ngettext supports plural helper", () => {
    const t = new Translator("en", translations);
    const apples = plural(msg`${1} apple`, msg`${1} apples`, 1);
    assert.equal(t.ngettext(apples), "1 apple");
});

test("ngettext supports plural helper with multiple forms", () => {
    const t = new Translator("ru", translations);
    const apples = plural(
        msg`${5} apple`,
        msg`${5} apples`,
        msg`${5} many apples`,
        5,
    );
    assert.equal(t.ngettext(apples), "5 яблок");
});

test("ngettext substitutes values from the chosen plural form", () => {
    const t = new Translator("en", translations);
    assert.equal(
        t.ngettext(
            msg`${"Bob"} ${1} carrot`,
            msg`${2} carrots for ${"Bob"}`,
            1,
        ),
        "Bob 1 carrot",
    );
    assert.equal(
        t.ngettext(
            msg`${"Bob"} ${1} carrot`,
            msg`${2} carrots for ${"Bob"}`,
            2,
        ),
        "2 carrots for Bob",
    );
});

test("npgettext handles context with plurals", () => {
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

test("ngettext handles context-aware plural helper", () => {
    const t = new Translator("ru", translations);
    const apples = context("company").plural(
        msg`${2} apple`,
        msg`${2} apples`,
        2,
    );
    assert.equal(t.npgettext(apples), "2 Apple устройства");
});

test("ngettext returns default forms when translation missing", () => {
    const t = new Translator("en", {});
    t.useLocale("fr");
    assert.equal(t.ngettext(msg`${1} apple`, msg`${1} apples`, 1), "1 apple");
    assert.equal(t.ngettext(msg`${2} apple`, msg`${2} apples`, 2), "2 apples");
});
