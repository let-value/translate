import assert from "node:assert/strict";
import { test } from "node:test";
import type { GetTextTranslations } from "gettext-parser";
import { createElement, Fragment } from "react";
import { renderToPipeableStream } from "react-dom/server";

import { Message, Plural, TranslationsProvider } from "../src/index.ts";
import { StringWritable } from "./utils.ts";

const translations: GetTextTranslations = { charset: "utf-8", headers: {}, translations: { "": {} } };

const message = test("Message renders interpolated children", async () => {
    const { pipe } = renderToPipeableStream(
        createElement(
            TranslationsProvider,
            { translations: { en: translations } },
            createElement(Message, null, "Hello ", createElement("b", null, "World"), "!"),
        ),
    );

    const result = await pipe(new StringWritable()).promise;

    assert.equal(result, "<!--$-->Hello <b>World</b>!<!-- --><!--/$-->");
});

const plural = test("Plural selects plural form", async () => {
    const forms = [
        createElement(Fragment, null, "One ", createElement("b", null, "item")),
        createElement(Fragment, null, "Many ", createElement("i", null, "items")),
    ] as const;

    const { pipe } = renderToPipeableStream(
        createElement(
            TranslationsProvider,
            { translations: { en: translations } },
            createElement(Plural, { number: 2, forms }),
        ),
    );

    const result = await pipe(new StringWritable()).promise;

    assert.equal(result, "<!--$-->Many <i>items</i><!--/$-->");
});

await Promise.all([message, plural]);
