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

            // Several entrypoints can map to the same destination file, so
            // collection spans the whole run rather than a single entrypoint:
            // one .po is written from every translation that targets it, and a
            // later entrypoint never re-merges the file against a subset of its
            // own messages (which would obsolete or drop the others').
            // Every onCollected hook runs before any writer does, so a writer
            // registered by the first entrypoint still sees the complete set.
            const collections = new Map<string, { locale: string; translations: Translation[] }>();

            build.onCollected(({ entrypoint, files, output }) => {
                for (const { path, translations } of files) {
                    for (const locale of build.context.config.locales) {
                        const destination = build.context.config.destination({ entrypoint, locale, path });
                        const collection = collections.get(destination);
                        if (collection) {
                            collection.translations.push(...translations);
                            continue;
                        }

                        const created = { locale, translations: [...translations] };
                        collections.set(destination, created);

                        output(destination, async () => {
                            const contents = await fs.readFile(destination).catch(() => undefined);
                            const existing = contents ? gettextParser.po.parse(contents) : undefined;

                            const record = collect(
                                created.translations,
                                created.locale,
                                build.context.config.defaultLocale,
                            );
                            const out = merge(
                                [{ translations: record }],
                                existing as never,
                                build.context.config.obsolete,
                                created.locale,
                                build.context.generatedAt,
                            );

                            if (hasChanges(out, existing as never)) {
                                await fs.mkdir(dirname(destination), { recursive: true });
                                await fs.writeFile(destination, gettextParser.po.compile(out));
                            }
                        });
                    }
                }
            });
        },
    };
}
