import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ExtractorPlugin } from "../../plugin.ts";
import { resolveImports } from "../core/resolve.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): ExtractorPlugin {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");
            build.onResolve({ filter: /.*/ }, ({ entrypoint, path }) => {
                return {
                    entrypoint,
                    path: resolve(path),
                };
            });
            build.onLoad({ filter }, async ({ entrypoint, path }) => {
                const contents = await readFile(path, "utf8");
                return { entrypoint, path, contents };
            });
            build.onExtract({ filter }, ({ entrypoint, path, contents }) => {
                const { translations, imports, warnings } = parseSource(contents, path);
                if (build.context.config.walk) {
                    const paths = resolveImports(path, imports);
                    for (const p of paths) {
                        build.resolvePath({ entrypoint, path: p });
                    }
                }
                for (const warning of warnings) {
                    build.context.logger?.warn(`${warning.error} at ${warning.reference}`);
                }
                return {
                    entrypoint,
                    path,
                    translations,
                };
            });
        },
    } satisfies ExtractorPlugin;
}
