import path from 'node:path';
import { parseFile, RawMessage } from './parse';
import { resolveImports } from './walk';
import { collect as collectImpl, buildPo as buildPoImpl } from './po';

export { parseFile } from './parse';
export type { RawMessage, ParseResult } from './parse';
export { resolveImports } from './walk';
export { collect, buildPo } from './po';
export type { Message } from './po';

/** Walk the dependency graph starting from entry and collect raw messages. */
export function extract(entry: string): RawMessage[] {
  const queue = [path.resolve(entry)];
  const visited = new Set<string>();
  const all: RawMessage[] = [];

  while (queue.length) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    const { messages, imports } = parseFile(file);
    all.push(...messages);

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

