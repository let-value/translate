import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { isExcluded } from "../../exclude.ts";
import type { Plugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";
import type { Translation } from "./queries/types.ts";
import { resolveImportResults } from "./resolve.ts";

const filter = /\.([cm]?tsx?|jsx?)$/;
const namespace = "source";

export function core(): Plugin<string, Translation[]> {
    return {
        name: "core",
        setup(build) {
            build.context.logger?.debug("core plugin initialized");

            build.onResolve({ filter, namespace }, ({ entrypoint, path, import: imp, data }) => {
                return {
                    entrypoint,
                    namespace,
                    path: resolve(path),
                    import: imp,
                    data,
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
                    return { entrypoint, path, namespace, data: [] as Translation[] };
                }

                const { translations, imports, warnings } = result;

                if (build.context.config.walk) {
                    const { resolved, unresolved } = resolveImportResults(path, imports);
                    for (const result of resolved) {
                        if (build.context.paths.has(result.path)) {
                            continue;
                        }

                        build.resolve({ entrypoint, path: result.path, namespace, import: result.import });
                    }
                    for (const { spec, error } of unresolved) {
                        const imp = imports.find((imp) => imp.spec === spec);
                        if (
                            imp &&
                            isExcluded({ entrypoint, path: spec, namespace, import: imp }, build.context.config.exclude)
                        ) {
                            continue;
                        }
                        build.context.logger?.warn(
                            `Unable to resolve import "${spec}" from ${path}${error ? `: ${error}` : ""}`,
                        );
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
