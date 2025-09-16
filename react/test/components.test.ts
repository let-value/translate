import assert from "node:assert/strict";
import { test } from "node:test";
import { message as msg, Translator } from "@let-value/translate";
import { renderStream } from "@let-value/translate-e2e/tests/utils.ts";
import type { GetTextTranslations } from "gettext-parser";
import { createElement, Fragment } from "react";
import { renderToPipeableStream } from "react-dom/server";

import { Message, Plural, TranslationsProvider } from "../src/components/index.ts";

const translations: GetTextTranslations = { charset: "utf-8", headers: {}, translations: { "": {} } };

function normalize(html: string) {
    return html.replace(/<!-- -->/g, "");
}

test("Message matches translate message function", async () => {
    const locale = new Translator({ en: translations }).getLocale("en");
    const name = "World";

    const cases = [
        { el: createElement(Message, null, "hello"), expected: locale.message`hello` },
        { el: createElement(Message, null, "hello ", name), expected: locale.message`hello ${name}` },
        { el: createElement(Message, null, "hello"), expected: locale.message("hello") },
        { el: createElement(Message, null, `hello ${name}`), expected: locale.message`hello ${name}` },
        {
            el: createElement(Message, { context: "verb" } as never, "run"),
            expected: locale.context`verb`.message`run`,
        },
    ] as const;

    for (const { el, expected } of cases) {
        const stream = renderToPipeableStream(
            createElement(TranslationsProvider, { translations: { en: translations } }, el),
        );
        const result = normalize(await renderStream(stream));
        assert.equal(result, `<!--$-->${expected}<!--/$-->`);
    }
});

test("Plural matches translate plural function", async () => {
    const locale = new Translator({ en: translations }).getLocale("en");
    const name = "item";

    const cases = [
        {
            el: createElement(Plural, {
                number: 1,
                forms: [createElement(Fragment, null, "one"), createElement(Fragment, null, "many")],
            }),
            expected: locale.plural(msg`one`, msg`many`, 1),
        },
        {
            el: createElement(Plural, {
                number: 2,
                forms: [createElement(Fragment, null, "One ", name), createElement(Fragment, null, "Many ", name, "s")],
            }),
            expected: locale.plural(msg`One ${name}`, msg`Many ${name}s`, 2),
        },
        {
            el: createElement(Plural, {
                number: 2,
                context: "count",
                forms: [createElement(Fragment, null, "One"), createElement(Fragment, null, "Many")],
            }),
            expected: locale.context`count`.plural(msg`One`, msg`Many`, 2),
        },
        {
            el: createElement(Plural, {
                number: 2,
                forms: ["りんご", createElement(Fragment, null, 2, " りんご")],
            }),
            expected: locale.plural(msg`りんご`, msg`2 りんご`, 2),
        },
    ] as const;

    for (const { el, expected } of cases) {
        const stream = renderToPipeableStream(
            createElement(TranslationsProvider, { translations: { en: translations } }, el),
        );
        const result = normalize(await renderStream(stream));
        assert.equal(result, `<!--$-->${expected}<!--/$-->`);
    }
});
