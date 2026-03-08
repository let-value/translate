import type { GetTextTranslationRecord } from "gettext-parser";
import { getNPlurals } from "plural-forms";

import type { Translation } from "../core/queries/types.ts";

export function collect(source: Translation[], locale?: string): GetTextTranslationRecord {
    const translations: GetTextTranslationRecord = { "": {} };
    const nplurals = locale ? Number(getNPlurals(locale)) : undefined;

    for (const { context, id, message, comments, obsolete, plural } of source) {
        const ctx = context || "";
        if (!translations[ctx]) {
            translations[ctx] = {};
        }

        const length = plural ? (nplurals ?? message.length) : 1;

        const existing = translations[ctx][id];
        const refs = new Set<string>();
        if (existing?.comments?.reference) {
            existing.comments.reference.split(/\r?\n|\r/).forEach((r) => {
                refs.add(r);
            });
        }
        if (comments?.reference) {
            comments.reference.split(/\r?\n|\r/).forEach((r) => {
                refs.add(r);
            });
        }

        const msgstr = existing?.msgstr ? existing.msgstr.slice(0, length) : Array.from({ length }, () => "");
        while (msgstr.length < length) msgstr.push("");

        translations[ctx][id] = {
            msgctxt: context || undefined,
            msgid: id,
            msgid_plural: plural,
            msgstr,
            comments: {
                ...existing?.comments,
                ...comments,
                reference: refs.size ? Array.from(refs).join("\n") : undefined,
            },
            obsolete: existing?.obsolete ?? obsolete,
        };
    }

    return translations;
}
