import { describe, expect, test } from "vite-plus/test";
import { message as msg, Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { render } from "vitest-browser-react";
import { TranslationsProvider, useTranslations } from "../src/index.ts";

const translations: GetTextTranslations = { charset: "utf-8", headers: {}, translations: { "": {} } };
const locale = new Translator({ en: translations }).getLocale("en");
const name = "World";
const count = 3;

function wrap(children: React.ReactNode) {
    return <TranslationsProvider translations={{ en: translations }}>{children}</TranslationsProvider>;
}

function GreetingDirect() {
    const t = useTranslations();
    return <span>{t.message`Hello, ${name}!`}</span>;
}

function GreetingDestructured() {
    const { message } = useTranslations();
    return <span>{message`Hello, ${name}!`}</span>;
}

function ItemCountDirect() {
    const t = useTranslations();
    return <span>{t.plural(msg`one item`, msg`${count} items`, count)}</span>;
}

function ItemCountDestructured() {
    const { plural } = useTranslations();
    return <span>{plural(msg`one item`, msg`${count} items`, count)}</span>;
}

function ContextDirect() {
    const t = useTranslations();
    return <span>{t.context`verb`.message`run`}</span>;
}

function ContextDestructured() {
    const { context } = useTranslations();
    return <span>{context`verb`.message`run`}</span>;
}

describe("useTranslations — without destructuring", () => {
    test("message with interpolation", async () => {
        const screen = await render(wrap(<GreetingDirect />));
        await expect.element(screen.getByText(locale.message`Hello, ${name}!`)).toBeInTheDocument();
    });

    test("plural", async () => {
        const screen = await render(wrap(<ItemCountDirect />));
        await expect
            .element(screen.getByText(locale.plural(msg`one item`, msg`${count} items`, count)))
            .toBeInTheDocument();
    });

    test("context", async () => {
        const screen = await render(wrap(<ContextDirect />));
        await expect.element(screen.getByText(locale.context`verb`.message`run`)).toBeInTheDocument();
    });
});

describe("useTranslations — with destructuring", () => {
    test("message with interpolation", async () => {
        const screen = await render(wrap(<GreetingDestructured />));
        await expect.element(screen.getByText(locale.message`Hello, ${name}!`)).toBeInTheDocument();
    });

    test("plural", async () => {
        const screen = await render(wrap(<ItemCountDestructured />));
        await expect
            .element(screen.getByText(locale.plural(msg`one item`, msg`${count} items`, count)))
            .toBeInTheDocument();
    });

    test("context", async () => {
        const screen = await render(wrap(<ContextDestructured />));
        await expect.element(screen.getByText(locale.context`verb`.message`run`)).toBeInTheDocument();
    });
});
