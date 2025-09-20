import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { Translator } from "../src/translator.ts";

const empty = gettextParser.po.parse(Buffer.from(""));
const ruUrl = new URL("./fixtures/ru.po", import.meta.url);

await test("getLocale returns locale translator", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({ en: empty, ru });
    const name = "World";
    assert.equal(t.getLocale("ru").message`Hello, ${name}!`, "Привет, World!");
});

await test("fetchLocale loads translations", async () => {
    const t = new Translator({
        en: empty,
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    });
    const name = "World";
    const lt = await t.fetchLocale("ru");
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
});

await test("getLocale warns and returns untranslated fallback for async locales", async () => {
    const t = new Translator({
        en: empty,
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    });
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    try {
        // @ts-expect-error async locale cannot be loaded synchronously
        const lt = t.getLocale("ru");
        const name = "World";
        assert.equal(lt.message`Hello, ${name}!`, "Hello, World!");
    } finally {
        console.warn = originalWarn;
    }

    assert.ok(warnings.some((entry) => String(entry).includes("Translator.getLocale")));
});
