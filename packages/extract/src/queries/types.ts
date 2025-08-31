import type Parser from "tree-sitter";
import type { GetTextTranslation } from "gettext-parser";

export interface MessageMatch {
	node: Parser.SyntaxNode;
	translation: GetTextTranslation;
	comment?: Parser.SyntaxNode;
}

export interface QuerySpec {
	pattern: string;
	extract(match: Parser.QueryMatch): MessageMatch[];
}
