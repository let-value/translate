import type { GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";
import type { Message } from "./messages.ts";

export function buildPo(locale: string, messages: Message[]): string {
    const headers = {
        "content-type": "text/plain; charset=UTF-8",
        "plural-forms": `nplurals=${getNPlurals(locale)}; plural=${getFormula(locale)};`,
        language: locale,
    } as Record<string, string>;

    const poObj: GetTextTranslations = {
        charset: "utf-8",
        headers,
        translations: { "": {} },
    };

    for (const m of messages) {
        poObj.translations[""][m.msgid] = {
            msgid: m.msgid,
            msgstr: m.msgstr.length ? m.msgstr : [""],
        };
    }

    return gettextParser.po.compile(poObj).toString();
}
