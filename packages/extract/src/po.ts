import type { GetTextTranslation, GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";

export interface Message {
    msgid: string;
    msgstr: string[];
    references: string[];
    comments: string[];
}

export function collect(raw: GetTextTranslation[]): Message[] {
    const map = new Map<string, Message>();
    for (const m of raw) {
        if (!map.has(m.msgid)) {
            map.set(m.msgid, {
                msgid: m.msgid,
                msgstr: [],
                references: [],
                comments: [],
            });
        }
        // biome-ignore lint/style/noNonNullAssertion: true
        const entry = map.get(m.msgid)!;
        if (entry.msgstr.length === 0 && m.msgstr.length)
            entry.msgstr = m.msgstr;
        if (m.comments?.reference) entry.references.push(m.comments.reference);
        if (m.comments?.extracted) entry.comments.push(m.comments.extracted);
    }
    return Array.from(map.values());
}

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
