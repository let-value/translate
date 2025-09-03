import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { message } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

test("translator substitutes template values", () => {
    const name = "World";
    const t = new Translator("en", {});
    assert.equal(t.message(message`Hello, ${name}!`), "Hello, World!");
});

test("translator applies translations with placeholders", async () => {
    const name = "World";
    const ruUrl = new URL("./fixtures/ru.po", import.meta.url);
    const translations = {
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    };
    const t = new Translator("en", translations);
    await t.useLocale("ru");
    assert.equal(t.message`Hello, ${name}!`, "Привет, World!");
});

test("translator loads translations on demand", async () => {
    const name = "World";
    const ruUrl = new URL("./fixtures/ru.po", import.meta.url);
    const t = new Translator("en", {});
    await t.load("ru", async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)));
    await t.useLocale("ru");
    assert.equal(t.message`Hello, ${name}!`, "Привет, World!");
});

test("message returns original string when translation missing", async () => {
    const t = new Translator("en", {});
    await t.useLocale("fr");
    assert.equal(t.message(message`Untranslated`), "Untranslated");
});

test("gettext alias works", () => {
    const t = new Translator("en", {});
    assert.equal(t.gettext(message`Alias`), "Alias");
});
