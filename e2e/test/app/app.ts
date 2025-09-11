import fs from "node:fs/promises";
import * as gettextParser from "gettext-parser";
import { Translator, message } from "@let-value/translate";

const name = "World";

export async function runApp(locale: string, count: number) {
    const translations: Record<string, gettextParser.GetTextTranslations> = {};
    try {
        const url = new URL(`./translations/app.${locale}.po`, import.meta.url);
        const content = await fs.readFile(url);
        translations[locale] = gettextParser.po.parse(content);
    } catch {
        // missing translation file
    }
    const t = new Translator(translations).getLocale(locale as never);
    const greeting = t.message(message`こんにちは、${name}！`);
    const items = t.ngettext(
        message`りんご`,
        message`${count} りんご`,
        count,
    );
    return { greeting, items };
}
