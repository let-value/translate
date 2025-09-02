import path from "node:path";
import type { GetTextTranslation } from "gettext-parser";

import { parseFile } from "./parse.ts";
import { buildPo as buildPoImpl, collect as collectImpl } from "./po.ts";
import { resolveImports } from "./walk.ts";

export type { ParseResult } from "./parse.ts";
export { parseFile } from "./parse.ts";
export type { Message } from "./po.ts";
export { buildPo, collect } from "./po.ts";
export { resolveImport, resolveImports } from "./walk.ts";

/** Walk the dependency graph starting from entry and collect raw messages. */
export function extract(entry: string): GetTextTranslation[] {
    const queue = [path.resolve(entry)];
    const visited = new Set<string>();
    const all: GetTextTranslation[] = [];

    while (queue.length) {
        const file = queue.shift();
        if (!file) {
            break;
        }

        if (visited.has(file)) {
            continue;
        }
        visited.add(file);

        const { translations, imports } = parseFile(file);
        all.push(...translations);

        const resolved = resolveImports(file, imports);
        for (const next of resolved) {
            if (!visited.has(next)) queue.push(next);
        }
    }

    return all;
}

/** Convenience function to collect and build a PO file. */
export function extractPo(entry: string, locale: string): string {
    const raw = extract(entry);
    const messages = collectImpl(raw);
    return buildPoImpl(locale, messages);
}
