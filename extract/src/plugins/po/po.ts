import fs from "node:fs/promises";
import { basename, dirname, extname } from "node:path";
import type { GetTextTranslationRecord, GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";
import { assign } from "radash";
import type { CollectResult, ExtractorPlugin, GenerateArgs, ExtractContext } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";

export function collect(source: Translation[]): GetTextTranslationRecord {
    const translations: GetTextTranslationRecord = { "": {} };

    for (const { context, id, message, comments, obsolete, plural } of source) {
        const ctx = context || "";
        if (!translations[ctx]) {
            translations[ctx] = {};
        }

        translations[ctx][id] = {
            msgctxt: context || undefined,
            msgid: id,
            msgid_plural: plural,
            msgstr: message.length ? message : [""],
            comments: comments,
            obsolete: obsolete,
        };
    }

    return translations;
}

export function merge(
    locale: string,
    sources: CollectResult[],
    existing: string | Buffer | undefined,
    strategy: "mark" | "remove" = "mark",
): string {
    let headers: Record<string, string> = {};
    let translations: GetTextTranslationRecord = { "": {} };

    if (existing) {
        const parsed = gettextParser.po.parse(existing);
        headers = parsed.headers || {};
        translations = parsed.translations || { "": {} };
        for (const ctx of Object.keys(translations)) {
            for (const id of Object.keys(translations[ctx])) {
                if (ctx === "" && id === "") continue;
                translations[ctx][id].obsolete = true;
            }
        }
    }

    const collected = sources.reduce((acc, { translations }) => assign(acc, translations as GetTextTranslationRecord), {
        "": {},
    } as GetTextTranslationRecord);

    for (const [ctx, msgs] of Object.entries(collected)) {
        if (!translations[ctx]) translations[ctx] = {};
        for (const [id, entry] of Object.entries(msgs)) {
            const existingEntry = translations[ctx][id];
            if (existingEntry) {
                entry.msgstr = existingEntry.msgstr;
                entry.comments = {
                    ...entry.comments,
                    translator: existingEntry.comments?.translator,
                };
            }
            entry.obsolete = false;
            translations[ctx][id] = entry;
        }
    }

    headers = {
        ...headers,
        "content-type": headers["content-type"] || "text/plain; charset=UTF-8",
        "plural-forms": `nplurals=${getNPlurals(locale)}; plural=${getFormula(locale)};`,
        language: locale,
    };

    if (strategy === "remove") {
        for (const ctx of Object.keys(translations)) {
            for (const id of Object.keys(translations[ctx])) {
                if (translations[ctx][id].obsolete) {
                    delete translations[ctx][id];
                }
            }
        }
    }

    const poObj: GetTextTranslations = {
        charset: "utf-8",
        headers,
        translations,
    };

    return gettextParser.po.compile(poObj).toString();
}

export function po(): ExtractorPlugin {
    return {
        name: "po",
        setup(build) {
            build.onCollect({ filter: /.*/ }, ({ entrypoint, translations, ...rest }) => {
                const record = collect(translations as Translation[]);
                const destination = `${basename(entrypoint, extname(entrypoint))}.po`;

                return {
                    ...rest,
                    entrypoint,
                    destination,
                    translations: record,
                };
            });
            build.onGenerate({ filter: /.*\/po$/ }, async ({ path, locale, collected }: GenerateArgs, ctx: ExtractContext) => {
                const existing = await fs.readFile(path).catch(() => undefined);
                const out = merge(locale, collected, existing, ctx.config.obsolete);
                await fs.mkdir(dirname(path), { recursive: true });
                await fs.writeFile(path, out);
            });
        },
    };
}
