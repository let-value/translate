/** biome-ignore-all lint/complexity/useLiteralKeys: jp */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as gettextParser from "gettext-parser";
import ts from "typescript";
import { defineConfig, react, run } from "../../../extract/src/index.ts";

const appPath = fileURLToPath(new URL("./app.tsx", import.meta.url));
const appDir = dirname(appPath);
const translationsDir = join(appDir, "translations");

async function extract() {
    await fs.rm(translationsDir, { recursive: true, force: true });
    const config = defineConfig({
        entrypoints: appPath.replaceAll("\\", "/"),
        locales: ["en", "ru", "sl", "sk"],
        defaultLocale: "ja",
        plugins: [react()],
    });
    await run(config.entrypoints[0], { config });
}

async function loadRunApp() {
    const source = await fs.readFile(appPath, "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.React,
        },
    });
    const jsPath = join(appDir, "app.mjs");
    await fs.writeFile(jsPath, outputText);
    return (await import(pathToFileURL(jsPath).href)) as {
        runApp(
            locale: string,
            count: number,
        ): Promise<{
            translated: string;
            def: string;
            greeting: string;
            items: string;
        }>;
    };
}

async function update(
    locale: string,
    { translated, def, greeting, forms }: { translated: string; def: string; greeting: string; forms: string[] },
) {
    const file = join(translationsDir, `app.${locale}.po`);
    const po = gettextParser.po.parse(await fs.readFile(file));
    const msgs = po.translations[""];

    msgs["延期されたメッセージ"].msgstr = [translated];
    msgs["messageId"].msgstr = [def];
    msgs["こんにちは、${name}！"].msgstr = [greeting];
    msgs["りんご"].msgstr = forms;

    await fs.writeFile(file, gettextParser.po.compile(po));
}

test("react app works end to end", async (t) => {
    await extract();
    t.after(async () => {
        await fs.rm(translationsDir, { recursive: true, force: true });
    });

    const { runApp } = await loadRunApp();

    // Default locale - Japanese
    let result = await runApp("ja", 1);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("ja", 2);
    assert.equal(result.items, "りんご");

    // English before translation
    result = await runApp("en", 1);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("en", 2);
    assert.equal(result.items, "2 りんご");

    await update("en", {
        translated: "Deferred message",
        def: "Default message",
        greeting: "Hello, ${name}!",
        forms: ["apple", "${count} apples"],
    });
    result = await runApp("en", 1);
    assert.equal(result.translated, "Deferred message");
    assert.equal(result.def, "Default message");
    assert.equal(result.greeting, "Hello, World!");
    assert.equal(result.items, "apple");
    result = await runApp("en", 2);
    assert.equal(result.items, "2 apples");

    // Russian before translation
    result = await runApp("ru", 1);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("ru", 2);
    assert.equal(result.items, "2 りんご");
    result = await runApp("ru", 5);
    assert.equal(result.items, "5 りんご");

    await update("ru", {
        translated: "Отложенное сообщение",
        def: "Сообщение по умолчанию",
        greeting: "Привет, ${name}!",
        forms: ["яблоко", "${count} яблока", "${count} яблок"],
    });
    result = await runApp("ru", 1);
    assert.equal(result.translated, "Отложенное сообщение");
    assert.equal(result.def, "Сообщение по умолчанию");
    assert.equal(result.greeting, "Привет, World!");
    assert.equal(result.items, "яблоко");
    result = await runApp("ru", 2);
    assert.equal(result.items, "2 яблока");
    result = await runApp("ru", 5);
    assert.equal(result.items, "5 яблок");

    // Slovenian before translation
    result = await runApp("sl", 1);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "1 りんご");
    result = await runApp("sl", 2);
    assert.equal(result.items, "2 りんご");
    result = await runApp("sl", 3);
    assert.equal(result.items, "3 りんご");
    result = await runApp("sl", 5);
    assert.equal(result.items, "りんご");

    await update("sl", {
        translated: "Zamujeno sporočilo",
        def: "Privzeto sporočilo",
        greeting: "Živjo, ${name}!",
        forms: ["jabolk", "jabolko", "${count} jabolka", "${count} jabolki"],
    });
    result = await runApp("sl", 1);
    assert.equal(result.translated, "Zamujeno sporočilo");
    assert.equal(result.def, "Privzeto sporočilo");
    assert.equal(result.greeting, "Živjo, World!");
    assert.equal(result.items, "jabolko");
    result = await runApp("sl", 2);
    assert.equal(result.items, "2 jabolka");
    result = await runApp("sl", 3);
    assert.equal(result.items, "3 jabolki");
    result = await runApp("sl", 5);
    assert.equal(result.items, "jabolk");

    // Slovak before translation
    result = await runApp("sk", 1);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "りんご");
    result = await runApp("sk", 2);
    assert.equal(result.items, "2 りんご");
    result = await runApp("sk", 5);
    assert.equal(result.items, "5 りんご");

    await update("sk", {
        translated: "Odložená správa",
        def: "Predvolená správa",
        greeting: "Ahoj, ${name}!",
        forms: ["jablko", "${count} jablká", "${count} jabĺk"],
    });
    result = await runApp("sk", 1);
    assert.equal(result.translated, "Odložená správa");
    assert.equal(result.def, "Predvolená správa");
    assert.equal(result.greeting, "Ahoj, World!");
    assert.equal(result.items, "jablko");
    result = await runApp("sk", 2);
    assert.equal(result.items, "2 jablká");
    result = await runApp("sk", 5);
    assert.equal(result.items, "5 jabĺk");

    // Missing translations fallback
    result = await runApp("fr", 2);
    assert.equal(result.translated, "延期されたメッセージ");
    assert.equal(result.def, "デフォルトメッセージ");
    assert.equal(result.greeting, "こんにちは、World！");
    assert.equal(result.items, "2 りんご");
});
