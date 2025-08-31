import { parseSync } from 'oxc-parser';
import { walk } from 'oxc-walker';
import fs from 'node:fs';
import path from 'node:path';
import type { Program } from 'oxc-parser';

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
  const ast: Program = parseSync(absPath, source).program;

  const messages: RawMessage[] = [];
  const imports: string[] = [];

  walk(ast, {
    enter(node) {
      switch (node.type) {
        case 'CallExpression': {
          const callee = node.callee;
          if (
            callee.type === 'Identifier' &&
            (callee.name === 't' || callee.name === 'ngettext')
          ) {
            const arg = node.arguments[0];
            if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
              const line = source.slice(0, node.start).split(/\r?\n/).length;
              const rel = path.relative(process.cwd(), absPath);
              const reference = `${rel}:${line}`;
              const prev = lines[line - 2]?.trim();
              const comment = prev && prev.startsWith('//') ? prev.slice(2).trim() : undefined;
              messages.push({ msgid: arg.value, reference, comment });
            }
          }
          break;
        }
        case 'ImportDeclaration':
          imports.push(node.source.value);
          break;
      }
    }
  });

  return { messages, imports };
}

