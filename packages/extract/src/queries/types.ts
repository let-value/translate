import type Parser from 'tree-sitter';

export interface MessageMatch {
  node: Parser.SyntaxNode;
  msgid: string;
}

export interface QuerySpec {
  pattern: string;
  extract(match: Parser.QueryMatch): MessageMatch[];
}
