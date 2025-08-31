import fs from "node:fs";
import path from "node:path";
import type { GetTextTranslation } from "gettext-parser";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TS from "tree-sitter-typescript";
import { messageQueries } from "./queries";

export interface ParseResult {
	messages: GetTextTranslation[];
	imports: string[];
}

/**
 * Parse a single JavaScript/TypeScript file and collect translation messages
 * defined via t()/ngettext() calls. Returns the messages and the raw import
 * specifiers found in the file.
 */
export function parseFile(filePath: string): ParseResult {
	const absPath = path.resolve(filePath);
	const source = fs.readFileSync(absPath, "utf8");

	const parser = new Parser();
	const ext = path.extname(absPath);
	const language = (
		ext === ".ts" || ext === ".tsx"
			? (TS.typescript as unknown)
			: (JavaScript as unknown)
	) as Parser.Language;
	parser.setLanguage(language);
	const tree = parser.parse(source);

	const messages: GetTextTranslation[] = [];
	const imports: string[] = [];

	const seen = new Set<number>();
	for (const spec of messageQueries) {
		const query = new Parser.Query(language, spec.pattern);
		for (const match of query.matches(tree.rootNode)) {
			for (const { node, translation } of spec.extract(match)) {
				if (seen.has(node.id)) continue;
				seen.add(node.id);
				const line = node.startPosition.row + 1;
				const rel = path.relative(process.cwd(), absPath);
				const reference = `${rel}:${line}`;
				const t: GetTextTranslation = {
					...translation,
					comments: {
						...(translation.comments ?? {}),
						reference,
					},
				};
				messages.push(t);
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
		const node = match.captures.find((c) => c.name === "import")!.node;
		imports.push(node.text);
	}

	return { messages, imports };
}
