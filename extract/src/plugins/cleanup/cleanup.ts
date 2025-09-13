import fs from "node:fs/promises";
import { dirname, join } from "node:path";

import * as gettextParser from "gettext-parser";

import type { Plugin } from "../../plugin.ts";

export function cleanup(): Plugin {
    return {
        name: "cleanup",
        setup(build) {
            build.context.logger?.debug("cleanup plugin initialized");
            const processedDirs = new Set<string>();
            build.onProcess({ namespace: "cleanup", filter: /.*/ }, async ({ file }, api) => {
                await api.defer("translate");
                const generated = new Set(api.graph.entries("translate").map(([f]) => f));
                const dir = dirname(file.path);
                if (processedDirs.has(dir)) return;
                processedDirs.add(dir);
                const files = await fs.readdir(dir).catch(() => []);
                for (const f of files.filter((p) => p.endsWith(".po"))) {
                    const full = join(dir, f);
                    if (generated.has(full)) continue;
                    const contents = await fs.readFile(full).catch(() => undefined);
                    if (!contents) continue;
                    const parsed = gettextParser.po.parse(contents);
                    const hasTranslations = Object.entries(parsed.translations || {})
                        .some(([ctx, msgs]) =>
                            Object.keys(msgs).some((id) => !(ctx === "" && id === "")),
                        );
                    if (hasTranslations) {
                        api.context.logger?.warn({ path: full }, "stray translation file");
                    } else {
                        await fs.unlink(full);
                        api.context.logger?.info({ path: full }, "removed empty translation file");
                    }
                }
            });
        },
    };
}

