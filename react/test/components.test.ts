import assert from "node:assert/strict";
import { test } from "node:test";
import type { GetTextTranslations } from "gettext-parser";
import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";

import { Message, Plural, TranslationsProvider } from "../src/index.ts";

const translations: GetTextTranslations = { charset: "utf-8", headers: {}, translations: { "": {} } };

test("Message renders interpolated children", () => {
    const output = renderToString(
        createElement(
            TranslationsProvider,
            { translations: { en: translations } },
            createElement(Message, null, "Hello ", createElement("b", null, "World"), "!"),
        ),
    );
    assert.equal(output, "Hello <b>World</b>!");
});

test("Plural selects plural form", () => {
    const forms = [
        createElement(Fragment, null, "One ", createElement("b", null, "item")),
        createElement(Fragment, null, "Many ", createElement("i", null, "items")),
    ] as const;
    const output = renderToString(
        createElement(
            TranslationsProvider,
            { translations: { en: translations } },
            createElement(Plural, { number: 2, forms }),
        ),
    );
    assert.equal(output, "Many <i>items</i>");
});
