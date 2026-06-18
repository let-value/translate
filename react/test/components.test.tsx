import { describe, expect, test } from "vite-plus/test";
import { message as msg, Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { render } from "vitest-browser-react";

import { Message, Plural, TranslationsProvider } from "../src/components/index.ts";

const translations: GetTextTranslations = { charset: "utf-8", headers: {}, translations: { "": {} } };
const locale = new Translator({ en: translations }).getLocale("en");
const name = "World";

describe("Message", () => {
    test("simple string", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Message>hello</Message>
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.message`hello`)).toBeInTheDocument();
    });

    test("children with interpolated value", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Message>hello {name}</Message>
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.message`hello ${name}`)).toBeInTheDocument();
    });

    test("call syntax", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Message>hello</Message>
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.message("hello"))).toBeInTheDocument();
    });

    test("template literal child", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Message>{`hello ${name}`}</Message>
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.message`hello ${name}`)).toBeInTheDocument();
    });

    test("with context", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Message context="verb">run</Message>
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.context`verb`.message`run`)).toBeInTheDocument();
    });
});

describe("Plural", () => {
    const item = "item";

    test("singular picks first form", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Plural number={1} forms={[<>one</>, <>many</>]} />
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.plural(msg`one`, msg`many`, 1))).toBeInTheDocument();
    });

    test("plural picks second form with interpolation", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Plural number={2} forms={[<>One {item}</>, <>Many {item}s</>]} />
            </TranslationsProvider>,
        );
        await expect
            .element(screen.getByText(locale.plural(msg`One ${item}`, msg`Many ${item}s`, 2)))
            .toBeInTheDocument();
    });

    test("with context", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Plural number={2} context="count" forms={[<>One</>, <>Many</>]} />
            </TranslationsProvider>,
        );
        await expect
            .element(screen.getByText(locale.context`count`.plural(msg`One`, msg`Many`, 2)))
            .toBeInTheDocument();
    });

    test("mixed string and element forms", async () => {
        const screen = await render(
            <TranslationsProvider translations={{ en: translations }}>
                <Plural number={2} forms={["りんご", <>{2} りんご</>]} />
            </TranslationsProvider>,
        );
        await expect.element(screen.getByText(locale.plural(msg`りんご`, msg`2 りんご`, 2))).toBeInTheDocument();
    });
});
