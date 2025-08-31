import { relative } from "node:path";
import type Parser from "tree-sitter";

import type { Context } from "./types";

export function getReference(node: Parser.SyntaxNode, { path }: Context) {
	const line = node.startPosition.row + 1;
	const col = node.startPosition.column + 1;
	const rel = relative(process.cwd(), path);
	return `${rel}:${line}:${col}`;
}

function getComment(node: Parser.SyntaxNode): string {
	const text = node.text;
	if (text.startsWith("/*")) {
		return text
			.slice(2, -2)
			.replace(/^\s*\*?\s*/gm, "")
			.trim();
	}
	return text.replace(/^\/\/\s?/, "").trim();
}

export const withComment = {
	pattern(pattern: string): string {
		return `(
  ((comment) @comment .)?
  (expression_statement ${pattern})
)`;
	},
	extract(match: Parser.QueryMatch): string | undefined {
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		if (!comment) {
			return undefined;
		}

		return getComment(comment);
	},
};
