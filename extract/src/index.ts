import type { GetTextTranslation } from "gettext-parser";

import { runPipeline } from "./plugin.ts";
import { corePlugin } from "./corePlugin.ts";
import { poPlugin } from "./poPlugin.ts";

export type { ParseResult } from "./parse.ts";
export { parseFile } from "./parse.ts";
export type { Message } from "./messages.ts";
export { collect } from "./messages.ts";
export { buildPo } from "./po.ts";
export { resolveImport, resolveImports } from "./walk.ts";
export { corePlugin } from "./corePlugin.ts";
export { poPlugin } from "./poPlugin.ts";

/** Walk the dependency graph starting from entry and collect raw messages using the plugin pipeline. */
export async function extract(entry: string): Promise<GetTextTranslation[]> {
    const plugin = corePlugin();
    return runPipeline(entry, [plugin], "en");
}

/** Convenience function to collect and build a PO file. */
export async function extractPo(entry: string, locale: string): Promise<string> {
    const core = corePlugin();
    const po = poPlugin();
    await runPipeline(entry, [core, po], locale);
    return po.getPo() ?? "";
}
