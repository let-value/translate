import fs from "node:fs/promises";
import { dirname } from "node:path";
import * as gettextParser from "gettext-parser";

import type { Plugin } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";
import { collect } from "./collect.ts";
import { hasChanges } from "./hasChanges.ts";
import { merge } from "./merge.ts";

export function po(): Plugin {
    return {
        name: "po",
        setup(build) {
            build.context.logger?.debug("po plugin initialized");

            build.onCollected(({ entrypoint, files, output }) => {
                const collections = new Map<string, { locale: string; translations: Translation[] }>();

                for (const { path, translations } of files) {
                    for (const locale of build.context.config.locales) {
                        const destination = build.context.config.destination({ entrypoint, locale, path });
                        let collection = collections.get(destination);
                        if (!collection) {
                            collection = { locale, translations: [] };
                            collections.set(destination, collection);
                        }
                        collection.translations.push(...translations);
                    }
                }

                for (const [destination, { locale, translations }] of collections) {
                    output(destination, async () => {
                        const contents = await fs.readFile(destination).catch(() => undefined);
                        const existing = contents ? gettextParser.po.parse(contents) : undefined;

                        const record = collect(translations, locale);
                        const out = merge(
                            [{ translations: record }],
                            existing as never,
                            build.context.config.obsolete,
                            locale,
                            build.context.generatedAt,
                        );

                        if (hasChanges(out, existing as never)) {
                            await fs.mkdir(dirname(destination), { recursive: true });
                            await fs.writeFile(destination, gettextParser.po.compile(out));
                        }
                    });
                }
            });
        },
    };
}
