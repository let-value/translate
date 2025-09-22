import type { GetTextTranslationRecord, GetTextTranslations } from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";

import type { ObsoleteStrategy } from "../../configuration.ts";

export interface Collected {
    translations: GetTextTranslationRecord;
}

export function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const tzo = -date.getTimezoneOffset();
    const sign = tzo >= 0 ? "+" : "-";
    const offsetHours = pad(Math.floor(Math.abs(tzo) / 60));
    const offsetMinutes = pad(Math.abs(tzo) % 60);
    return `${year}-${month}-${day} ${hours}:${minutes}${sign}${offsetHours}${offsetMinutes}`;
}

export function merge(
    sources: Collected[],
    existing: GetTextTranslations | undefined,
    obsolete: ObsoleteStrategy,
    locale: string,
    generatedAt: Date,
): GetTextTranslations {
    let headers: Record<string, string> = {};
    let translations: GetTextTranslationRecord = { "": {} };
    let obsoleteTranslations: GetTextTranslationRecord = {};
    const nplurals = getNPlurals(locale);

    if (existing) {
        headers = existing.headers || {};
        translations = existing.translations || { "": {} };
        obsoleteTranslations = existing.obsolete || {};
        for (const ctx of Object.keys(translations)) {
            for (const id of Object.keys(translations[ctx])) {
                if (ctx === "" && id === "") continue;
                translations[ctx][id].obsolete = true;
            }
        }
    }

    const collected: GetTextTranslationRecord = { "": {} };
    for (const { translations } of sources) {
        for (const [ctx, msgs] of Object.entries(translations)) {
            if (!collected[ctx]) collected[ctx] = {};
            for (const [id, entry] of Object.entries(msgs)) {
                const existing = collected[ctx][id];
                const refs = new Set<string>();
                if (existing?.comments?.reference) {
                    existing.comments.reference.split(/\r?\n|\r/).forEach((r) => {
                        refs.add(r);
                    });
                }
                if (entry.comments?.reference) {
                    entry.comments.reference.split(/\r?\n|\r/).forEach((r) => {
                        refs.add(r);
                    });
                }
                collected[ctx][id] = {
                    ...existing,
                    ...entry,
                    comments: {
                        ...existing?.comments,
                        ...entry.comments,
                        reference: refs.size ? Array.from(refs).join("\n") : undefined,
                    },
                };
            }
        }
    }

    for (const [ctx, msgs] of Object.entries(collected)) {
        if (!translations[ctx]) translations[ctx] = {};
        for (const [id, entry] of Object.entries(msgs)) {
            const existingEntry = translations[ctx][id] ?? obsoleteTranslations[ctx]?.[id];
            if (existingEntry) {
                entry.msgstr = existingEntry.msgstr;
                entry.comments = {
                    ...entry.comments,
                    translator: existingEntry.comments?.translator,
                };
            }
            delete entry.obsolete;
            entry.msgstr = entry.msgstr.slice(0, nplurals);
            while (entry.msgstr.length < nplurals) {
                entry.msgstr.push("");
            }
            translations[ctx][id] = entry;
            if (obsoleteTranslations[ctx]) {
                delete obsoleteTranslations[ctx][id];
            }
        }
    }

    for (const ctx of Object.keys(translations)) {
        for (const id of Object.keys(translations[ctx])) {
            if (ctx === "" && id === "") {
                continue;
            }
            const entry = translations[ctx][id];
            if (entry.obsolete) {
                if (!obsoleteTranslations[ctx]) {
                    obsoleteTranslations[ctx] = {};
                }
                obsoleteTranslations[ctx][id] = entry;
                delete translations[ctx][id];
            }
        }
    }

    headers = {
        ...headers,
        "Content-Type": headers["Content-Type"] || "text/plain; charset=UTF-8",
        "Plural-Forms": `nplurals=${nplurals}; plural=${getFormula(locale)};`,
        language: locale,
        "MIME-Version": "1.0",
        "Content-Transfer-Encoding": "8bit",
        "POT-Creation-Date": formatDate(generatedAt),
        "x-generator": "@let-value/translate-extract",
    };

    return {
        charset: "utf-8",
        headers,
        translations,
        ...(obsolete === "mark" && Object.keys(obsoleteTranslations).length ? { obsolete: obsoleteTranslations } : {}),
    };
}
