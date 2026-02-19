import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Plugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";
import type { Translation } from "./queries/types.ts";
import { resolveImports } from "./resolve.ts";

const filter = /\.([cm]?tsx?|jsx?)$/;
const namespace = "source";

export function core(): Plugin<string, Translation[]> {
    return {
        name: "core",
        setup(build) {
            build.context.logger?.debug("core plugin initialized");
            build.onResolve({ filter, namespace }, ({ entrypoint, path }) => {
                return {
                    entrypoint,
                    namespace,
                    path: resolve(path),
                };
            });

            build.onLoad({ filter, namespace }, async ({ entrypoint, path }) => {
                const data = await readFile(path, "utf8");
                return {
                    entrypoint,
                    path,
                    namespace,
                    data,
                };
            });

            build.onProcess({ filter, namespace }, ({ entrypoint, path, data }) => {
                const result = parseSource(data, path);

                if (result.entrypoint && entrypoint !== path) {
                    build.source(path);
                    return;
                }

                const { translations, imports, warnings } = result;

                if (build.context.config.walk) {
                    const paths = resolveImports(path, imports);
                    for (const path of paths) {
                        if (build.context.paths.has(path)) {
                            continue;
                        }

                        build.resolve({ entrypoint, path, namespace });
                    }
                }

                for (const warning of warnings) {
                    build.context.logger?.warn(`${warning.error} at ${warning.reference}`);
                }

                build.resolve({
                    entrypoint,
                    path,
                    namespace: "translate",
                    data: translations,
                });

                return undefined;
            });
        },
    };
}
