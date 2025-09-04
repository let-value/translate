import fs from "node:fs/promises";
import { basename, dirname, extname } from "node:path";
import type { GetTextTranslationRecord, GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { getFormula, getNPlurals } from "plural-forms";
import { assign } from "radash";
import type { CollectResult, ExtractorPlugin, GenerateArgs } from "../../plugin.ts";
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

export function generate(locale: string, sources: CollectResult[]): string {
    const headers = {
        "content-type": "text/plain; charset=UTF-8",
        "plural-forms": `nplurals=${getNPlurals(locale)}; plural=${getFormula(locale)};`,
        language: locale,
    } as Record<string, string>;

    let translations: GetTextTranslationRecord = { "": {} };

    translations = sources.reduce(
        (acc, { translations }) => assign(acc, translations as GetTextTranslationRecord),
        translations,
    );

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
            build.onGenerate({ filter: /.*\/po$/ }, async ({ path, locale, collected }: GenerateArgs) => {
                const out = generate(locale, collected);
                await fs.mkdir(dirname(path), { recursive: true });
                await fs.writeFile(path, out);
            });
        },
    };
}
