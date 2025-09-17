import fs from "node:fs/promises";
import { dirname, join } from "node:path";

import * as gettextParser from "gettext-parser";

import type { Plugin } from "../../plugin.ts";

const namespace = "cleanup";

export function cleanup(): Plugin {
    return {
        name: "cleanup",
        setup(build) {
            build.context.logger?.debug("cleanup plugin initialized");
            const processed = new Set<string>();
            const generated = new Set<string>();
            const dirs = new Set<string>();
            let dispatched = false;

            build.onResolve({ namespace, filter: /.*/ }, ({ path }) => {
                generated.add(path);
                dirs.add(dirname(path));

                Promise.all([build.defer("source"), build.defer("translate")]).then(() => {
                    if (dispatched) {
                        return;
                    }
                    dispatched = true;

                    for (const path of dirs.values()) {
                        build.process({ entrypoint: path, path, namespace, data: undefined });
                    }
                });

                return undefined;
            });

            build.onProcess({ namespace, filter: /.*/ }, async ({ path }) => {
                if (processed.has(path)) {
                    return undefined;
                }
                processed.add(path);
                const files = await fs.readdir(path).catch(() => []);
                for (const f of files.filter((p) => p.endsWith(".po"))) {
                    const full = join(path, f);
                    if (generated.has(full)) {
                        continue;
                    }
                    const contents = await fs.readFile(full).catch(() => undefined);
                    if (!contents) {
                        continue;
                    }
                    const parsed = gettextParser.po.parse(contents);
                    const hasTranslations = Object.entries(parsed.translations || {}).some(([ctx, msgs]) =>
                        Object.keys(msgs).some((id) => !(ctx === "" && id === "")),
                    );
                    if (hasTranslations) {
                        build.context.logger?.warn({ path: full }, "stray translation file");
                    } else {
                        await fs.unlink(full);
                        build.context.logger?.info({ path: full }, "removed empty translation file");
                    }
                }
                return undefined;
            });
        },
    };
}
