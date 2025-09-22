import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import type { GetTextTranslations } from "gettext-parser";
import { message } from "../src/messages.ts";
import { Translator } from "../src/translator.ts";

test("translator substitutes template values", () => {
    const name = "World";
    const t = new Translator({}).getLocale("en" as never);
    assert.equal(t.translate(message`Hello, ${name}!`), "Hello, World!");
});

test("message warns and translates deferred message input", () => {
    const t = new Translator({}).getLocale("en" as never);
    const deferred = message`Hello`;
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    try {
        // @ts-expect-error message does not accept deferred inputs
        assert.equal(t.message(deferred), "Hello");
    } finally {
        console.warn = originalWarn;
    }

    assert.ok(warnings.some((entry) => String(entry).includes("LocaleTranslator.message")));
});

test("translator applies translations with placeholders", async () => {
    const name = "World";
    const ruUrl = new URL("./fixtures/ru.po", import.meta.url);
    const t = await new Translator({
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    }).fetchLocale("ru");
    assert.equal(t.message`Hello, ${name}!`, "Привет, World!");
});

test("translator loads translations on demand", async () => {
    const name = "World";
    const ruUrl = new URL("./fixtures/ru.po", import.meta.url);
    const t = new Translator({});
    const lt = await t.loadLocale("ru", async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)));
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
});

test("message returns original string when translation missing", async () => {
    const t = new Translator({}).getLocale("fr" as never);
    assert.equal(t.translate(message`Untranslated`), "Untranslated");
});

test("translate falls back to source when translation empty", () => {
    const translations: GetTextTranslations = {
        charset: "utf-8",
        headers: {},
        translations: {
            "": {
                "延期されたメッセージ": {
                    msgid: "延期されたメッセージ",
                    msgstr: [""],
                },
            },
        },
    };
    const t = new Translator({ ja: translations }).getLocale("ja");
    assert.equal(t.translate(message`延期されたメッセージ`), "延期されたメッセージ");
});

test("gettext alias works", () => {
    const t = new Translator({}).getLocale("en" as never);
    assert.equal(t.gettext`Alias`, "Alias");
});
