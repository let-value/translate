import type { GetTextTranslation } from "gettext-parser";

import { runPipeline } from "../../packages/extract/src/plugin.ts";
import { corePlugin } from "./corePlugin.ts";

export type { ParseResult } from "./parse.ts";
export { parseFile } from "./parse.ts";
export type { Message } from "./po.ts";
export { buildPo, collect } from "./po.ts";
export { resolveImport, resolveImports } from "./walk.ts";
export { corePlugin } from "./corePlugin.ts";

/** Walk the dependency graph starting from entry and collect raw messages using the plugin pipeline. */
export async function extract(entry: string): Promise<GetTextTranslation[]> {
    const plugin = corePlugin({ generatePo: false });
    return runPipeline(entry, [plugin], "en");
}

/** Convenience function to collect and build a PO file. */
export async function extractPo(entry: string, locale: string): Promise<string> {
    const plugin = corePlugin();
    await runPipeline(entry, [plugin], locale);
    return plugin.getPo() ?? "";
}
