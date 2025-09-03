import fs from "node:fs/promises";
import nodePath from "node:path";
import type { ExtractorPlugin, GenerateArgs } from "./plugin.ts";
import { buildPo as buildPoImpl, collect as collectImpl } from "./po.ts";

export interface PoPluginOptions {
    /** Write the generated PO file to disk. */
    writePo?: boolean;
}

export function poPlugin(options: PoPluginOptions = {}) {
    const writePo = options.writePo ?? false;
    let po: string | undefined;
    return {
        name: "po",
        setup(build) {
            build.onCollect((messages) => {
                return collectImpl(messages);
            });
            build.onGenerate(async ({ locale, messages }: GenerateArgs, ctx) => {
                const out = buildPoImpl(locale, messages);
                po = out;
                if (writePo) {
                    const file = nodePath.join(ctx.dest, `${locale}.po`);
                    await fs.mkdir(nodePath.dirname(file), { recursive: true });
                    await fs.writeFile(file, out);
                }
            });
        },
        getPo() {
            return po;
        },
    } as ExtractorPlugin & { getPo(): string | undefined };
}
