import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Plugin } from "../../plugin.ts";
import { resolveImports } from "../core/resolve.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): Plugin {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");
            build.onResolve({ filter: /.*/, namespace: "source" }, ({ file }) => resolve(file.path));
            build.onLoad({ filter, namespace: "source" }, async ({ file }) => readFile(file.path, "utf8"));
            build.onProcess({ filter, namespace: "source" }, ({ file, data: contents }, api) => {
                const { translations, imports, warnings } = parseSource(contents as string, file.path);
                if (api.context.config.walk) {
                    const paths = resolveImports(file.path, imports);
                    for (const p of paths) api.emit({ path: p, namespace: "source" });
                }
                for (const warning of warnings) {
                    api.context.logger?.warn(`${warning.error} at ${warning.reference}`);
                }
                api.emit({ path: file.path, namespace: "translate", data: translations });
                return translations;
            });
        },
    };
}

