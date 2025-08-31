import fs from 'node:fs';
import path from 'node:path';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TS from 'tree-sitter-typescript';
import { messageQueries } from './queries';

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

  const parser = new Parser();
  const ext = path.extname(absPath);
  const language = (ext === '.ts' || ext === '.tsx'
    ? (TS.typescript as unknown)
    : (JavaScript as unknown)) as Parser.Language;
  parser.setLanguage(language);
  const tree = parser.parse(source);

  const messages: RawMessage[] = [];
  const imports: string[] = [];

  for (const spec of messageQueries) {
    const query = new Parser.Query(language, spec.pattern);
    for (const match of query.matches(tree.rootNode)) {
      for (const { node, msgid } of spec.extract(match)) {
        const line = node.startPosition.row + 1;
        const rel = path.relative(process.cwd(), absPath);
        const reference = `${rel}:${line}`;
        const prev = lines[line - 2]?.trim();
        const comment =
          prev && prev.startsWith('//') ? prev.slice(2).trim() : undefined;
        messages.push({ msgid, reference, comment });
      }
    }
  }

  const importQuery = new Parser.Query(
    language,
    `
      (import_statement
        source: (string (string_fragment) @import))
    `,
  );

  for (const match of importQuery.matches(tree.rootNode)) {
    const node = match.captures.find(c => c.name === 'import')!.node;
    imports.push(node.text);
  }

  return { messages, imports };
}

