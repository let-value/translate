import type { GetTextTranslation } from "gettext-parser";
import type Parser from "tree-sitter";

export interface MessageMatch {
    node: Parser.SyntaxNode;
    translation: GetTextTranslation;
}

export interface Context {
    path: string;
}

export interface QuerySpec {
    pattern: string;
    extract(match: Parser.QueryMatch): MessageMatch | undefined;
}
