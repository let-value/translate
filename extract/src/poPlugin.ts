import fs from "node:fs/promises";
import path from "node:path";
import { buildPo } from "./po.ts";
import { collect } from "./messages.ts";
import type { ExtractorPlugin } from "../../packages/extract/src/plugin.ts";

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
            build.onCollect((messages) => collect(messages));
            build.onGenerate(async ({ locale, messages }, ctx) => {
                if (!locale) return;
                const out = buildPo(locale, messages);
                po = out;
                if (writePo) {
                    const file = path.join(ctx.dest, `${locale}.po`);
                    await fs.mkdir(path.dirname(file), { recursive: true });
                    await fs.writeFile(file, out);
                }
            });
        },
        getPo() {
            return po;
        },
    } as ExtractorPlugin & { getPo(): string | undefined };
}

export { poPlugin as default };
