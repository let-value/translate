import fs from "node:fs/promises";
import { Suspense } from "react";
import * as gettextParser from "gettext-parser";
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

async function loadCatalog(locale: string) {
    try {
        const url = new URL(`./translations/app.${locale}.po`, import.meta.url);
        const content = await fs.readFile(url);
        return gettextParser.po.parse(content);
    } catch {
        // No translations available
        return undefined;
    }
}

export async function runApp(locale: string, count: number) {
    const translations = await loadCatalog(locale);

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

/**
 * Same app, but the catalog is loaded lazily — the shape that suspends on the
 * client. The server render must inline the catalog it resolved so hydration can
 * take the synchronous path.
 */
export async function runLazyApp(locale: string, count: number) {
    const element = (
        <Suspense fallback={<div id="fallback">loading</div>}>
            <LocaleProvider locale={locale as never}>
                <TranslationsProvider translations={{ [locale]: () => loadCatalog(locale) } as never}>
                    <App count={count} />
                </TranslationsProvider>
            </LocaleProvider>
        </Suspense>
    );

    const stream = renderToPipeableStream(element);
    const html = await renderStream(stream);

    const payload = html.match(/<script type="application\/json" data-translations="[^"]*">(.*?)<\/script>/s)?.[1];

    return {
        html,
        payload: payload
            ? (JSON.parse(payload) as { k: string[]; l: string; c: gettextParser.GetTextTranslations })
            : undefined,
    };
}
