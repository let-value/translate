import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";

import { plural as buildPlural, message } from "../src/messages.ts";
import { LocaleTranslator } from "../src/translator.ts";

function createTranslator(): LocaleTranslator {
    const translations = gettextParser.po.parse(
        readFileSync(new URL("./fixtures/locale-translator.po", import.meta.url)),
    );
    return new LocaleTranslator("fr" as never, translations);
}

test("LocaleTranslator.message substitutes template values", () => {
    const translator = createTranslator();
    const name = "Marie";

    assert.equal(translator.message`Hello, ${name}!`, "Bonjour, Marie!");
    assert.equal(translator.message("items"), "articles");
});

test("LocaleTranslator.plural selects translated forms", () => {
    const translator = createTranslator();

    const singular = 1;
    assert.equal(translator.plural(message`${singular} item`, message`${singular} items`, singular), "1 article");

    const plural = 3;
    assert.equal(translator.plural(message`${plural} item`, message`${plural} items`, plural), "3 articles");
});

test("LocaleTranslator.plural reuses base form values when alternate forms omit them", () => {
    const translator = createTranslator();

    const count = 4;
    assert.equal(translator.plural(message`${count} notification`, message("notifications"), count), "4 notifications");
});

test("LocaleTranslator.context overrides translations while substituting values", () => {
    const translator = createTranslator();

    const person = "Zoé";
    assert.equal(translator.context("greeting").message`Hello, ${person}!`, "Salut, Zoé!");

    assert.equal(translator.context("catalog").message("items"), "articles catalogue");

    const count = 2;
    assert.equal(
        translator.context("catalog").plural(message`${count} item`, message`${count} items`, count),
        "2 articles catalogue",
    );
});
