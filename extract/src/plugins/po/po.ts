import fs from "node:fs/promises";
import { dirname } from "node:path";
import * as gettextParser from "gettext-parser";

import type { Plugin } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";
import { collect } from "./collect.ts";
import { hasChanges } from "./hasChanges.ts";
import { merge } from "./merge.ts";

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
