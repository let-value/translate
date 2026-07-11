import { readFile } from "node:fs/promises";

import { isExcluded } from "../../exclude.ts";
import type { Plugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";
import { resolveImportResults } from "./resolve.ts";

const filter = /\.([cm]?tsx?|jsx?)$/;

export function core(): Plugin {
    return {
        name: "core",
        setup(build) {
            build.context.logger?.debug("core plugin initialized");

            build.onLoad(filter, ({ path }) => readFile(path, "utf8"));

            build.onProcess(filter, ({ entrypoint, path, contents, emit }) => {
                const result = parseSource(contents, path);

                if (result.entrypoint && entrypoint !== path) {
                    // Promote to its own extraction pipeline and keep its
                    // messages out of the current entrypoint.
                    build.source({ entrypoint: path, path });
                    return true;
                }

                const { translations, imports, warnings } = result;

                if (build.context.config.walk) {
                    const { resolved, unresolved } = resolveImportResults(path, imports);
                    for (const result of resolved) {
                        if (build.context.paths.has(result.path)) {
                            continue;
                        }

                        build.source({ entrypoint, path: result.path, import: result.import });
                    }
                    for (const { spec, error } of unresolved) {
                        const imp = imports.find((imp) => imp.spec === spec);
                        if (
                            imp &&
                            isExcluded(
                                { entrypoint, path: spec, namespace: "source", import: imp },
                                build.context.config.exclude,
                            )
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

                emit(translations);
                return undefined;
            });
        },
    };
}
