import fs from "node:fs";
import { extname, resolve } from "node:path";
import type { GetTextTranslation } from "gettext-parser";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TS from "tree-sitter-typescript";

import { queries } from "./queries";
import { getReference } from "./queries/comment";
import type { Context } from "./queries/types";

export interface ParseResult {
	messages: GetTextTranslation[];
	imports: string[];
}

function getLanguage(path: string) {
	const ext = extname(path);
	return ext === ".ts" || ext === ".tsx" ? TS.typescript : JavaScript;
}

export function parseFile(filePath: string): ParseResult {
	const path = resolve(filePath);
	const source = fs.readFileSync(path, "utf8");
	return parseSource(source, path);
}

export function parseSource(source: string, path: string): ParseResult {
	const context: Context = {
		path,
	};

	const parser = new Parser();
	const language = getLanguage(path) as Parser.Language;
	parser.setLanguage(language);
	const tree = parser.parse(source);

	const messages: GetTextTranslation[] = [];
	const imports: string[] = [];

	const seen = new Set<number>();

	for (const spec of queries) {
		const query = new Parser.Query(language, spec.pattern);
		for (const match of query.matches(tree.rootNode)) {
			const message = spec.extract(match);
			if (!message) {
				continue;
			}

			const { node, translation } = message;
			if (seen.has(node.id)) {
				continue;
			}
			seen.add(node.id);
			const reference = getReference(node, context);

			messages.push({
				...translation,
				comments: {
					...translation.comments,
					reference,
				},
			});
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
		const node = match.captures.find((c) => c.name === "import")?.node;
		if (node) {
			imports.push(node.text);
		}
	}

	return { messages, imports };
}
