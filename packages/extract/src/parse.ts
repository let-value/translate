import { parseSync } from 'oxc-parser';
import fs from 'node:fs';
import path from 'node:path';

// Generic AST node type from oxc
export type Node = Record<string, any> | null | undefined;
export type Visitors = Record<string, (node: Node) => void>;

function walk(node: Node, visitors: Visitors): void {
  if (!node || typeof node !== 'object') return;
  const visit = visitors[(node as any).type];
  if (visit) visit(node);
  for (const key of Object.keys(node)) {
    const value = (node as any)[key];
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitors);
    } else if (value && typeof (value as any).type === 'string') {
      walk(value, visitors);
    }
  }
}

export interface RawMessage {
  msgid: string;
  reference: string;
  comment?: string;
}

export interface ParseResult {
  messages: RawMessage[];
  imports: string[];
}

/**
 * Parse a single JavaScript/TypeScript file and collect translation messages
 * defined via t()/ngettext() calls. Returns the messages and the raw import
 * specifiers found in the file.
 */
export function parseFile(filePath: string): ParseResult {
  const absPath = path.resolve(filePath);
  const source = fs.readFileSync(absPath, 'utf8');
  const lines = source.split(/\r?\n/);
  const ast = parseSync(absPath, source).program as Node;

  const messages: RawMessage[] = [];
  const imports: string[] = [];

  walk(ast, {
    CallExpression(node) {
      const callee = (node as any).callee;
      if (
        callee &&
        callee.type === 'Identifier' &&
        (callee.name === 't' || callee.name === 'ngettext')
      ) {
        const arg = (node as any).arguments[0];
        if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
          const loc = (node as any).loc?.start;
          const line = loc?.line ?? 1;
          const rel = path.relative(process.cwd(), absPath);
          const reference = `${rel}:${line}`;
          const prev = lines[line - 2]?.trim();
          const comment = prev && prev.startsWith('//') ? prev.slice(2).trim() : undefined;
          messages.push({ msgid: arg.value, reference, comment });
        }
      }
    },
    ImportDeclaration(node) {
      const spec = (node as any).source.value as string;
      imports.push(spec);
    }
  });

  return { messages, imports };
}

