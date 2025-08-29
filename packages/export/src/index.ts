import { parseSync } from 'oxc-parser';
import resolver from 'oxc-resolver';
import gettextParser from 'gettext-parser';
import { getFormula, getNPlurals } from 'plural-forms';
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

export interface Message {
  msgid: string;
  references: string[];
  comments: string[];
}

interface RawMessage {
  msgid: string;
  reference: string;
  comment?: string;
}

function extractFromFile(
  filePath: string,
  visited: Set<string> = new Set()
): RawMessage[] {
  const absPath = path.resolve(filePath);
  if (visited.has(absPath)) return [];
  visited.add(absPath);
  const source = fs.readFileSync(absPath, 'utf8');
  const lines = source.split(/\r?\n/);
  const ast = parseSync(absPath, source).program as Node;
  const messages: RawMessage[] = [];

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
      const result = resolver.sync(path.dirname(absPath), spec) as { path?: string };
      if (result.path) {
        messages.push(...extractFromFile(result.path, visited));
      }
    }
  });

  return messages;
}

export function extract(entry: string): Message[] {
  const raw = extractFromFile(entry);
  const map = new Map<string, Message>();
  for (const m of raw) {
    if (!map.has(m.msgid)) {
      map.set(m.msgid, { msgid: m.msgid, references: [], comments: [] });
    }
    const entryMsg = map.get(m.msgid)!;
    entryMsg.references.push(m.reference);
    if (m.comment) entryMsg.comments.push(m.comment);
  }
  return Array.from(map.values());
}

export function buildPo(locale: string, messages: Message[]): string {
  const headers = {
    'content-type': 'text/plain; charset=UTF-8',
    'plural-forms': `nplurals=${getNPlurals(locale)}; plural=${getFormula(locale)};`,
    language: locale
  } as Record<string, string>;

  const poObj: any = {
    charset: 'utf-8',
    headers,
    translations: { '': {} as Record<string, any> }
  };

  for (const m of messages) {
    poObj.translations[''][m.msgid] = {
      msgid: m.msgid,
      msgstr: [''],
      references: m.references.join('\n'),
      comments: m.comments.length
        ? { extracted: m.comments.join('\n') }
        : undefined
    };
  }

  return gettextParser.po.compile(poObj).toString();
}

export function extractToPo(entry: string, locale: string): string {
  const messages = extract(entry);
  return buildPo(locale, messages);
}

