import type { GetTextTranslation } from "gettext-parser";

import { corePlugin } from "./corePlugin.ts";
import { runPipeline } from "./plugin.ts";
import { poPlugin } from "./poPlugin.ts";

export { corePlugin } from "./corePlugin.ts";
export type { Message } from "./messages.ts";
export type { ParseResult } from "./parse.ts";
export { parseFile } from "./parse.ts";
export { collect } from "./messages.ts";
export { buildPo } from "./po.ts";
export { poPlugin } from "./poPlugin.ts";
export { resolveImport, resolveImports } from "./walk.ts";

/** Walk the dependency graph starting from entry and collect raw messages using the plugin pipeline. */
export async function extract(entry: string): Promise<GetTextTranslation[]> {
    const plugin = corePlugin();
    return runPipeline(entry, [plugin], "en");
}

/** Convenience function to collect and build a PO file. */
export async function extractPo(entry: string, locale: string): Promise<string> {
    const plugin = corePlugin();
    const po = poPlugin();
    await runPipeline(entry, [plugin, po], locale);
    return po.getPo() ?? "";
}
