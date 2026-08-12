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

            // A module shared by several entrypoints is processed once per
            // entrypoint, so without this the same warning is repeated as many
            // times as there are entrypoints reaching it.
            const reported = new Set<string>();
            const warnOnce = (message: string) => {
                if (reported.has(message)) {
                    return;
                }
                reported.add(message);
                build.context.logger?.warn(message);
            };

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
                    const { resolved, unresolved, external } = resolveImportResults(path, imports);
                    for (const spec of external) {
                        build.context.logger?.debug({ path, spec }, "skipping external import");
                    }
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
                        warnOnce(`Unable to resolve import "${spec}" from ${path}${error ? `: ${error}` : ""}`);
                    }
                }

                for (const warning of warnings) {
                    warnOnce(`${warning.error} at ${warning.reference}`);
                }

                emit(translations);
                return undefined;
            });
        },
    };
}
