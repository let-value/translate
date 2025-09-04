import fs from "node:fs/promises";
import nodePath from "node:path";
import type { ExtractorPlugin, GenerateArgs } from "./plugin.ts";
import { buildPo, collect } from "./po.ts";

export function poPlugin() {
    let po: string | undefined;
    return {
        name: "po",
        setup(build) {
            build.onCollect((messages) => {
                return collect(messages);
            });
            build.onGenerate(async ({ locale, messages }: GenerateArgs, ctx) => {
                const out = buildPo(locale, messages);
                po = out;

                const file = nodePath.join(ctx.dest, `${locale}.po`);
                await fs.mkdir(nodePath.dirname(file), { recursive: true });
                await fs.writeFile(file, out);
            });
        },
        getPo() {
            return po;
        },
    } as ExtractorPlugin & { getPo(): string | undefined };
}
