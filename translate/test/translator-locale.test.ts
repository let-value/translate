import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { Translator } from "../src/translator.ts";

const empty = gettextParser.po.parse(Buffer.from(""));
const ruUrl = new URL("./fixtures/ru.po", import.meta.url);

await test("getLocale returns locale translator", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator("en", { en: empty, ru });
    const name = "World";
    assert.equal(t.getLocale("ru").message`Hello, ${name}!`, "Привет, World!");
});

await test("fetchLocale loads translations", async () => {
    const t = new Translator("en", {
        en: empty,
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    });
    const name = "World";
    const lt = await t.fetchLocale("ru");
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
});

await test("getLocale throws for async locales", async () => {
    const t = new Translator("en", {
        en: empty,
        ru: async () => gettextParser.po.parse(await fs.promises.readFile(ruUrl)),
    });
    assert.throws(() => t.getLocale("ru"));
});
