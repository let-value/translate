import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ExtractorPlugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";
import { resolveImports } from "./resolve.ts";

const filter = /\.([cm]?tsx?|jsx?)$/;

export function core(): ExtractorPlugin {
    return {
        name: "core",
        setup(build) {
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
                const { translations, imports } = parseSource(contents, path);
                if (build.context.config.walk) {
                    const paths = resolveImports(path, imports);
                    for (const path of paths) {
                        build.resolvePath({
                            entrypoint,
                            path,
                        });
                    }
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
