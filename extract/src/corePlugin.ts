import fs from "node:fs/promises";
import nodePath from "node:path";
import { parseSource } from "./parse.ts";
import { resolveImport } from "./walk.ts";
import type { ExtractorPlugin } from "../../packages/extract/src/plugin.ts";

export function corePlugin(): ExtractorPlugin {
    return {
        name: "core",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path: spec, importer }) => {
                if (importer) {
                    return resolveImport(importer, spec);
                }
                return nodePath.resolve(spec);
            });
            build.onLoad({ filter: /\.([cm]?tsx?|jsx?)$/ }, async ({ path }) => {
                const contents = await fs.readFile(path, "utf8");
                return { contents };
            });
            build.onExtract({ filter: /\.([cm]?tsx?|jsx?)$/ }, ({ path, contents }) => {
                const { translations, imports } = parseSource(contents, path);
                return { messages: translations, imports };
            });
        },
    };
}

export { corePlugin as default };
