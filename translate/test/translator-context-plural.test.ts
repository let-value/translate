import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { context, message } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

function load(locale: string) {
    const po = fs.readFileSync(new URL(`./fixtures/${locale}.po`, import.meta.url));
    return gettextParser.po.parse(po);
}

const translations = {
    en: load("en"),
    ru: load("ru"),
};

test("context plural handles context-aware message pairs", () => {
    const t = new Translator(translations).getLocale("ru");
    assert.equal(t.context("company").plural(message`${1} apple`, message`${1} apples`, 1), "1 Apple устройство");
    assert.equal(t.context("company").plural(message`${2} apple`, message`${2} apples`, 2), "2 Apple устройства");
});

test("context builders accept context-aware messages", () => {
    const t = new Translator(translations).getLocale("ru");
    const verb = context("verb");
    assert.equal(t.translate(verb.message("Open")), "Открыть");
    const apples = context("company").plural(message`${3} apple`, message`${3} apples`, 3);
    assert.equal(t.translate(apples), "3 Apple устройства");
});

test("context plural substitutes values from the chosen plural form", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.context("ctx").plural(message`${1} apple`, message`${2} apples for ${"Bob"}`, 1), "1 apple");
    assert.equal(
        t.context("ctx").plural(message`${1} apple`, message`${2} apples for ${"Bob"}`, 2),
        "2 apples for Bob",
    );
});

test("context plural returns default forms when translation missing", () => {
    const t = new Translator(translations).getLocale("ru");
    assert.equal(t.context("company").plural(message`${1} pear`, message`${1} pears`, 1), "1 pear");
    assert.equal(t.context("company").plural(message`${2} pear`, message`${2} pears`, 2), "2 pears");
});

test("context plural rejects deferred input", () => {
    const t = new Translator(translations).getLocale("en");
    const deferred = context("company").plural(message`${1} apple`, message`${1} apples`, 1);
    assert.throws(() => {
        // @ts-expect-error context plural does not accept deferred inputs
        t.context("company").plural(deferred);
    }, /translate\(\)/);
});

test("npgettext alias works", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.npgettext("ctx", message`${1} apple`, message`${1} apples`, 1), "1 apple");
});

test("translator context accepts template literals for plurals", () => {
    const t = new Translator(translations).getLocale("en");
    assert.equal(t.context`company`.plural(message`${1} apple`, message`${1} apples`, 1), "1 apple");
});
