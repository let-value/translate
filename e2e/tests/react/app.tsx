import fs from "node:fs/promises";
import { message } from "@let-value/translate";
import { LocaleProvider, Message, Plural, TranslationsProvider, useTranslations } from "@let-value/translate-react";
import * as gettextParser from "gettext-parser";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const name = "World";

export async function runApp(locale: string, count: number) {
    let translations: gettextParser.GetTextTranslations | undefined;
    try {
        const url = new URL(`./translations/app.${locale}.po`, import.meta.url);
        const content = await fs.readFile(url);
        translations = gettextParser.po.parse(content);
    } catch {
        // No translations available
    }

    const deferred = message`延期されたメッセージ`;
    const descriptor = message({ id: "messageId", message: "デフォルトメッセージ" });

    function App() {
        const t = useTranslations();
        const translated = t.message(deferred);
        const def = t.message(descriptor);
        return (
            <div>
                <div id="translated">{translated}</div>
                <div id="def">{def}</div>
                <div id="greeting">
                    <Message>こんにちは、{name}！</Message>
                </div>
                <div id="items">
                    <Plural number={count} forms={["りんご", <>{count} りんご</>]} />
                </div>
            </div>
        );
    }

    const element = (
        <TranslationsProvider translations={{ [locale]: translations }}>
            <LocaleProvider locale={locale as never}>
                <App />
            </LocaleProvider>
        </TranslationsProvider>
    );

    const html = renderToStaticMarkup(element);

    function match(id: string) {
        return html.match(new RegExp(`<div id="${id}">([^<]*)</div>`))?.[1] ?? "";
    }

    return {
        translated: match("translated"),
        def: match("def"),
        greeting: match("greeting"),
        items: match("items"),
    };
}

