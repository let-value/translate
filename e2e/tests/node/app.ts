import fs from "node:fs/promises";
import { message, Translator } from "../../../translate/src/index.ts";
import * as gettextParser from "gettext-parser";

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

    const t = new Translator({ [locale]: translations }).getLocale(locale as never);

    const translated = t.message(deferred);
    const def = t.message(descriptor);
    const greeting = t.message`こんにちは、${name}！`;
    const items = t.ngettext(message`りんご`, message`${count} りんご`, count);

    return { translated, def, greeting, items };
}
