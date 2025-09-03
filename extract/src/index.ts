import path from "node:path";
import type { GetTextTranslation } from "gettext-parser";

import { runPipeline } from "./plugin.ts";
import { corePlugin } from "./core.ts";


export type { ParseResult } from "./parse.ts";
export { parseFile } from "./parse.ts";
export type { Message } from "./po.ts";
export { buildPo, collect } from "./po.ts";
export { resolveImport, resolveImports } from "./walk.ts";
export { corePlugin } from "./core.ts";
export { runPipeline } from "./plugin.ts";

/** Walk the dependency graph starting from entry and collect raw messages. */
export async function extract(entry: string): Promise<GetTextTranslation[]> {
    return runPipeline(path.resolve(entry), [corePlugin()], "");
}

/** Convenience function to collect and build a PO file. */
export async function extractPo(entry: string, locale: string): Promise<string> {
    const plugin = corePlugin();
    await runPipeline(path.resolve(entry), [plugin], locale);
    return plugin.po;
}
