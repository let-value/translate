import fs from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

import type { GetTextTranslationRecord, GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";

import type { ObsoleteStrategy } from "../../configuration.ts";
import type { Plugin } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";

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

export function collect(source: Translation[], locale?: string): GetTextTranslationRecord {
    const translations: GetTextTranslationRecord = { "": {} };
    const nplurals = locale ? getNPlurals(locale) : undefined;

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

export function merge(
    sources: Collected[],
    existing: string | Buffer | undefined,
    obsolete: ObsoleteStrategy,
    locale: string,
    generatedAt: Date,
): string {
    let headers: Record<string, string> = {};
    let translations: GetTextTranslationRecord = { "": {} };
    let obsoleteTranslations: GetTextTranslationRecord = {};
    const nplurals = getNPlurals(locale);

    if (existing) {
        const parsed = gettextParser.po.parse(existing);
        headers = parsed.headers || {};
        translations = parsed.translations || { "": {} };
        obsoleteTranslations = parsed.obsolete || {};
        for (const ctx of Object.keys(translations)) {
            for (const id of Object.keys(translations[ctx])) {
                if (ctx === "" && id === "") continue;
                translations[ctx][id].obsolete = true;
            }
        }
    }

    const collected: GetTextTranslationRecord = { "": {} };
    for (const { translations: record } of sources) {
        for (const [ctx, msgs] of Object.entries(record)) {
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
            entry.obsolete = false;
            entry.msgstr = entry.msgstr.slice(0, nplurals);
            while (entry.msgstr.length < nplurals) entry.msgstr.push("");
            translations[ctx][id] = entry;
            if (obsoleteTranslations[ctx]) delete obsoleteTranslations[ctx][id];
        }
    }

    for (const ctx of Object.keys(translations)) {
        for (const id of Object.keys(translations[ctx])) {
            if (ctx === "" && id === "") continue;
            const entry = translations[ctx][id];
            if (entry.obsolete) {
                if (!obsoleteTranslations[ctx]) obsoleteTranslations[ctx] = {};
                obsoleteTranslations[ctx][id] = entry;
                delete translations[ctx][id];
            }
        }
    }

    headers = {
        ...headers,
        "content-type": headers["content-type"] || "text/plain; charset=UTF-8",
        "plural-forms": `nplurals=${nplurals}; plural=${getFormula(locale)};`,
        language: locale,
        "pot-creation-date": formatDate(generatedAt),
        "x-generator": "@let-value/translate-extract",
    };

    const poObj: GetTextTranslations = {
        charset: "utf-8",
        headers,
        translations,
        ...(obsolete === "mark" && Object.keys(obsoleteTranslations).length ? { obsolete: obsoleteTranslations } : {}),
    };

    return gettextParser.po.compile(poObj).toString();
}

export function po(): Plugin {
    return {
        name: "po",
        setup(build) {
            build.context.logger?.debug("po plugin initialized");
            const collections = new Map<string, Translation[]>();
            const processed = new Set<string>();
            build.onProcess({ namespace: "translate", filter: /.*/ }, async ({ file, data }, api) => {
                const list = collections.get(file.path) ?? [];
                list.push(...((data as Translation[]) ?? []));
                collections.set(file.path, list);

                await api.defer("source");
                if (processed.has(file.path)) return;
                processed.add(file.path);

                const translations = collections.get(file.path)!;
                for (const locale of api.context.config.locales) {
                    api.context.locale = locale;
                    const record = collect(translations, locale);
                    const destination = api.context.config.destination({
                        entrypoint: api.context.entrypoint,
                        locale,
                        path: file.path,
                    });
                    const redirected = join(
                        dirname(destination),
                        `${basename(destination, extname(destination))}.po`,
                    );
                    const existing = await fs.readFile(redirected).catch(() => undefined);
                    const out = merge(
                        [{ translations: record }],
                        existing,
                        api.context.config.obsolete,
                        locale,
                        api.context.generatedAt,
                    );
                    await fs.mkdir(dirname(redirected), { recursive: true });
                    await fs.writeFile(redirected, out);
                    api.graph.add("translate", redirected, out);
                    api.emit({ path: redirected, namespace: "cleanup" });
                }
            });
        },
    };
}

