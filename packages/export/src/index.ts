import { parseSync } from 'oxc-parser';
import resolver from 'oxc-resolver';
import fs from 'node:fs';
import path from 'node:path';

type Node = Record<string, any> | null | undefined;
type Visitors = Record<string, (node: Node) => void>;

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

interface Message {
  msgid: string;
  file: string;
}

function extractFromFile(filePath: string, visited: Set<string> = new Set()): Message[] {
  const absPath = path.resolve(filePath);
  if (visited.has(absPath)) return [];
  visited.add(absPath);
  const source = fs.readFileSync(absPath, 'utf8');
  const ast = parseSync(absPath, source).program as Node;
  const messages: Message[] = [];

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
          messages.push({ msgid: arg.value, file: absPath });
        }
      }
    },
    ImportDeclaration(node) {
      const spec = (node as any).source.value as string;
      const result = resolver.sync(path.dirname(absPath), spec) as { path?: string };
      if (result.path) {
        messages.push(...extractFromFile(result.path, visited));
      }
    }
  });

  return messages;
}

export function extract(entry: string): Message[] {
  return extractFromFile(entry);
}

export function buildPot(messages: Message[]): string {
  const lines = [
    'msgid ""',
    'msgstr ""',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    ''
  ];
  for (const m of messages) {
    const rel = path.relative(process.cwd(), m.file);
    lines.push(`#: ${rel}`);
    lines.push(`msgid ${JSON.stringify(m.msgid)}`);
    lines.push('msgstr ""', '');
  }
  return lines.join('\n');
}

export function extractToPot(entry: string): string {
  const messages = extract(entry);
  return buildPot(messages);
}

