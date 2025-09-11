import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import * as gettextParser from "gettext-parser";
import { defineConfig, run } from "@let-value/translate-extract";

import { runApp } from "./app/app.ts";

const appPath = fileURLToPath(new URL("./app/app.ts", import.meta.url));
const appDir = dirname(appPath);
const translationsDir = join(appDir, "translations");

async function extract() {
    await fs.rm(translationsDir, { recursive: true, force: true });
    const config = defineConfig({
        entrypoints: appPath,
        locales: ["en", "ru", "sl"],
        defaultLocale: "ja",
    });
    await run(appPath, { config });
}

async function update(locale: string, greeting: string, forms: string[]) {
    const file = join(translationsDir, `app.${locale}.po`);
    const po = gettextParser.po.parse(await fs.readFile(file));
    const msgs = po.translations[""];
    const helloKey = "こんにちは、${name}！";
    const hello = msgs[helloKey]!;
    delete msgs[helloKey];
    hello.msgid = "こんにちは、${0}！";
    hello.msgstr[0] = greeting;
    msgs["こんにちは、${0}！"] = hello;

    const pluralKey = "りんご";
    const entry = msgs[pluralKey]!;
    delete msgs[pluralKey];
    entry.msgid = "りんご";
    entry.msgid_plural = "${0} りんご";
    entry.msgstr = forms;
    msgs["りんご"] = entry;

    await fs.writeFile(file, gettextParser.po.compile(po));
}

test("node app works end to end", async (t) => {
    await extract();
    t.after(async () => {
        await fs.rm(translationsDir, { recursive: true, force: true });
    });

    // Default locale - Japanese
    let result = await runApp("ja", 1);
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("ja", 2);
    assert.equal(result.items, "りんご");

    // English before translation
    result = await runApp("en", 1);
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("en", 2);
    assert.equal(result.items, "2 りんご");

    await update("en", "Hello, ${0}!", ["apple", "${0} apples"]);
    result = await runApp("en", 1);
    assert.equal(result.greeting, "Hello, World!");
    assert.equal(result.items, "apple");
    result = await runApp("en", 2);
    assert.equal(result.items, "2 apples");

    // Russian before translation
    result = await runApp("ru", 1);
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("ru", 2);
    assert.equal(result.items, "2 りんご");
    result = await runApp("ru", 5);
    assert.equal(result.items, "5 りんご");

    await update("ru", "Привет, ${0}!", ["яблоко", "${0} яблока", "${0} яблок"]);
    result = await runApp("ru", 1);
    assert.equal(result.greeting, "Привет, World!");
    assert.equal(result.items, "яблоко");
    result = await runApp("ru", 2);
    assert.equal(result.items, "2 яблока");
    result = await runApp("ru", 5);
    assert.equal(result.items, "5 яблок");

    // Slovenian before translation
    result = await runApp("sl", 1);
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "1 りんご");
    result = await runApp("sl", 2);
    assert.equal(result.items, "2 りんご");
    result = await runApp("sl", 3);
    assert.equal(result.items, "3 りんご");
    result = await runApp("sl", 5);
    assert.equal(result.items, "りんご");

    await update(
        "sl",
        "Živjo, ${0}!",
        ["jabolk", "jabolko", "${0} jabolka", "${0} jabolki"],
    );
    result = await runApp("sl", 1);
    assert.equal(result.greeting, "Živjo, World!");
    assert.equal(result.items, "jabolko");
    result = await runApp("sl", 2);
    assert.equal(result.items, "2 jabolka");
    result = await runApp("sl", 3);
    assert.equal(result.items, "3 jabolki");
    result = await runApp("sl", 5);
    assert.equal(result.items, "jabolk");

    // Missing translations fallback
    result = await runApp("fr", 2);
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "2 りんご");
});
