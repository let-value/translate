import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Plugin } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): Plugin<string, Translation[]> {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");
            build.onResolve({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => {
                return {
                    entrypoint,
                    namespace,
                    path: resolve(path),
                };
            });
            build.onLoad({ filter, namespace: "source" }, async ({ entrypoint, path, namespace }) => {
                const data = await readFile(path, "utf8");
                return {
                    entrypoint,
                    path,
                    namespace,
                    data,
                };
            });
            build.onProcess({ filter, namespace: "source" }, ({ entrypoint, path, namespace, data }) => {
                const { translations, warnings } = parseSource(data, path);

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
