import fs from "node:fs/promises";
import nodePath from "node:path";
import { parseSource } from "./parse.ts";
import { resolveImport } from "./walk.ts";
import { collect as collectImpl, buildPo as buildPoImpl, type Message } from "./po.ts";
import type { ExtractorPlugin } from "../../packages/extract/src/plugin.ts";

export interface CorePluginOptions {
    /** Write the generated PO file to disk. */
    writePo?: boolean;
    /** Enable PO generation hooks. */
    generatePo?: boolean;
}

export function corePlugin(options: CorePluginOptions = {}) {
    const writePo = options.writePo ?? false;
    const generatePo = options.generatePo ?? true;
    let po: string | undefined;
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
            if (generatePo) {
                build.onCollect((messages, ctx) => {
                    ctx.shared.collected = collectImpl(messages);
                });
                build.onGenerate(async (locale, messages, ctx) => {
                    const collected = (ctx.shared.collected as Message[] | undefined) ?? collectImpl(messages);
                    const out = buildPoImpl(locale, collected);
                    po = out;
                    if (writePo) {
                        const file = nodePath.join(ctx.dest, `${locale}.po`);
                        await fs.mkdir(nodePath.dirname(file), { recursive: true });
                        await fs.writeFile(file, out);
                    }
                });
            }
        },
        getPo() {
            return po;
        },
    } as ExtractorPlugin & { getPo(): string | undefined };
}

