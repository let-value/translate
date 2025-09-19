import fs from "node:fs/promises";
import { dirname } from "node:path";

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

export function hasChanges(left: GetTextTranslations, right?: GetTextTranslations): boolean {
    const ignoredKeys = new Set(["pot-creation-date", "po-revision-date"]);

    function deepEqual(left: unknown, right: unknown): boolean {
        if (left === right) {
            return true;
        }

        if (left == null || right == null) {
            return false;
        }

        if (typeof left !== typeof right) {
            return false;
        }

        if (Array.isArray(left)) {
            if (!Array.isArray(right) || left.length !== right.length) {
                return false;
            }

            return left.every((item, index) => deepEqual(item, right[index]));
        }

        if (typeof left === "object") {
            const keys1 = Object.keys(left).filter((key) => !ignoredKeys.has(key.toLowerCase()));
            const keys2 = Object.keys(right).filter((key) => !ignoredKeys.has(key.toLowerCase()));

            if (keys1.length !== keys2.length) {
                return false;
            }

            return keys1.every((key) => deepEqual(left[key as never], right[key as never]));
        }

        return false;
    }

    return !deepEqual(left, right);
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
        "content-type": headers["content-type"] || "text/plain; charset=UTF-8",
        "plural-forms": `nplurals=${nplurals}; plural=${getFormula(locale)};`,
        language: locale,
        "pot-creation-date": formatDate(generatedAt),
        "x-generator": "@let-value/translate-extract",
    };

    return {
        charset: "utf-8",
        headers,
        translations,
        ...(obsolete === "mark" && Object.keys(obsoleteTranslations).length ? { obsolete: obsoleteTranslations } : {}),
    };
}

const namespace = "translate";

export function po(): Plugin {
    return {
        name: "po",
        setup(build) {
            build.context.logger?.debug("po plugin initialized");
            const collections = new Map<
                string,
                {
                    locale: string;
                    translations: Translation[];
                }
            >();
            let dispatched = false;

            build.onResolve({ filter: /.*/, namespace }, async ({ entrypoint, path, data }) => {
                if (!data || !Array.isArray(data)) {
                    return undefined;
                }

                for (const locale of build.context.config.locales) {
                    const destination = build.context.config.destination({ entrypoint, locale, path });
                    if (!collections.has(destination)) {
                        collections.set(destination, { locale, translations: [] });
                    }

                    collections.get(destination)?.translations.push(...data);
                }

                Promise.all([build.defer("source"), build.defer(namespace)]).then(() => {
                    if (dispatched) {
                        return;
                    }
                    dispatched = true;

                    for (const path of collections.keys()) {
                        build.load({ entrypoint, path, namespace });
                    }
                });

                return undefined;
            });

            build.onLoad({ filter: /.*\.po$/, namespace }, async ({ entrypoint, path }) => {
                const contents = await fs.readFile(path).catch(() => undefined);
                const data = contents ? gettextParser.po.parse(contents) : undefined;
                return {
                    entrypoint,
                    path,
                    namespace,
                    data,
                };
            });

            build.onProcess({ filter: /.*\.po$/, namespace }, async ({ entrypoint, path, data }) => {
                const collected = collections.get(path);
                if (!collected) {
                    build.context.logger?.warn({ path }, "no translations collected for this path");
                    return undefined;
                }

                const { locale, translations } = collected;

                const record = collect(translations, locale);

                const out = merge(
                    [{ translations: record }],
                    data as never,
                    build.context.config.obsolete,
                    locale,
                    build.context.generatedAt,
                );

                if (hasChanges(out, data as never)) {
                    await fs.mkdir(dirname(path), { recursive: true });
                    await fs.writeFile(path, gettextParser.po.compile(out));
                }

                build.resolve({
                    entrypoint,
                    path,
                    namespace: "cleanup",
                    data: translations,
                });
            });
        },
    };
}
