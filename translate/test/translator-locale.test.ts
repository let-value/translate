import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "vite-plus/test";
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

await test("getLocale reads default-export translation modules", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({ en: empty, ru: { default: ru } });
    const name = "World";
    assert.equal(t.getLocale("ru").message`Hello, ${name}!`, "Привет, World!");
});

await test("fetchLocale loads promised default-export translation modules", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({
        en: empty,
        ru: Promise.resolve({ default: ru }),
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

await test("prime resolves a locale synchronously without invoking the loader", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    let calls = 0;
    const t = new Translator({
        en: empty,
        ru: async () => {
            calls++;
            return ru;
        },
    });

    t.prime("ru", ru);

    const lt = t.fetchLocale("ru");
    assert.ok(!(lt instanceof Promise));
    const name = "World";
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
    assert.equal(calls, 0);
});

await test("prime accepts default-export translation modules", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({ en: empty, ru: async () => ru });

    t.prime("ru", { default: ru });

    const lt = t.fetchLocale("ru");
    assert.ok(!(lt instanceof Promise));
    const name = "World";
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
});

await test("prime leaves an already-resolved locale alone", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({ en: empty, ru });
    const before = t.getLocale("ru");

    t.prime("ru", empty);

    assert.equal(t.getLocale("ru"), before);
    const name = "World";
    assert.equal(t.getLocale("ru").message`Hello, ${name}!`, "Привет, World!");
});

await test("dehydrate returns the catalog once the locale is resolved", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const t = new Translator({
        en: empty,
        ru: async () => ru,
    });

    assert.equal(t.dehydrate("ru"), undefined);

    await t.fetchLocale("ru");
    assert.deepEqual(t.dehydrate("ru"), ru);

    // Still available after getLocale consumed the pending translations.
    t.getLocale("en");
    assert.deepEqual(t.dehydrate("ru"), ru);
});

await test("a dehydrated catalog primes an independent translator", async () => {
    const ru = gettextParser.po.parse(await fs.promises.readFile(ruUrl));
    const server = new Translator({ en: empty, ru: async () => ru });
    await server.fetchLocale("ru");

    const client = new Translator({
        en: empty,
        ru: async () => {
            throw new Error("loader must not run");
        },
    });
    client.prime("ru", JSON.parse(JSON.stringify(server.dehydrate("ru"))));

    const lt = client.fetchLocale("ru");
    assert.ok(!(lt instanceof Promise));
    const name = "World";
    assert.equal(lt.message`Hello, ${name}!`, "Привет, World!");
});
