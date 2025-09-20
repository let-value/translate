/** biome-ignore-all lint/correctness/useUniqueElementIds: true */
import fs from "node:fs/promises";
import * as gettextParser from "gettext-parser";
// biome-ignore lint/correctness/noUnusedImports: need for jsx
import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import {
    LocaleProvider,
    Message,
    message,
    Plural,
    TranslationsProvider,
    useTranslations,
} from "../../../react/src/index.ts";
import { renderStream } from "../utils.ts";

const name = "World";

const deferred = message`延期されたメッセージ`;
const descriptor = message({ id: "messageId", message: "デフォルトメッセージ" });

function App({ count }: { count: number }) {
    const t = useTranslations();

    return (
        <div>
            <div id="translated">{t.translate(deferred)}</div>
            <div id="def">{t.translate(descriptor)}</div>
            <div id="greeting">
                <Message>こんにちは、{name}！</Message>
            </div>
            <div id="items">
                <Plural number={count} forms={["りんご", <>{count} りんご</>]} />
            </div>
        </div>
    );
}

export async function runApp(locale: string, count: number) {
    let translations: gettextParser.GetTextTranslations | undefined;
    try {
        const url = new URL(`./translations/app.${locale}.po`, import.meta.url);
        const content = await fs.readFile(url);
        translations = gettextParser.po.parse(content);
    } catch {
        // No translations available
    }

    const element = (
        <LocaleProvider locale={locale as never}>
            <TranslationsProvider translations={{ [locale]: translations }}>
                <App count={count} />
            </TranslationsProvider>
        </LocaleProvider>
    );

    const stream = renderToPipeableStream(element);
    const html = await renderStream(stream);

    function match(id: string) {
        const clean = html.replace(/<!--[^>]*-->/g, "");
        return clean.match(new RegExp(`<div id="${id}">([^<]*)</div>`))?.[1] ?? "";
    }

    return {
        translated: match("translated"),
        def: match("def"),
        greeting: match("greeting"),
        items: match("items"),
    };
}
