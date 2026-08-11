import fs from "node:fs/promises";
import { dirname, join } from "node:path";

import * as gettextParser from "gettext-parser";

import type { Plugin } from "../../plugin.ts";

export function cleanup(): Plugin {
    return {
        name: "cleanup",
        setup(build) {
            build.context.logger?.debug("cleanup plugin initialized");

            build.onOutputs(async ({ outputs }) => {
                const generated = new Set(outputs);
                const dirs = new Set(outputs.map((path) => dirname(path)));

                for (const dir of dirs) {
                    const files = await fs.readdir(dir).catch(() => []);
                    for (const file of files.filter((name) => name.endsWith(".po"))) {
                        const full = join(dir, file);
                        const contents = await fs.readFile(full).catch(() => undefined);
                        if (!contents) {
                            continue;
                        }
                        const parsed = gettextParser.po.parse(contents);
                        const hasTranslations = Object.entries(parsed.translations || {}).some(([ctx, msgs]) =>
                            Object.keys(msgs).some((id) => !(ctx === "" && id === "")),
                        );
                        if (!hasTranslations && generated.has(full)) {
                            await fs.unlink(full);
                        }
                        if (hasTranslations && !generated.has(full)) {
                            build.context.logger?.warn({ path: full }, "stray translation file");
                        }
                    }
                }
            });
        },
    };
}
