import type Parser from "tree-sitter";

export interface Comments {
    translator?: string;
    reference?: string;
    extracted?: string;
    flag?: string;
    previous?: string;
}

export interface Translation {
    context?: string;
    id: string;
    plural?: string;
    message: string[];
    comments?: Comments;
    obsolete?: boolean;
}

export interface Warning {
    error: string;
    reference: string;
}

export interface MessageMatch {
    node: Parser.SyntaxNode;
    translation?: Translation;
    error?: string;
}

export interface Context {
    path: string;
}

export interface QuerySpec {
    pattern: string;
    extract(match: Parser.QueryMatch): MessageMatch | undefined;
}

export interface ImportQuerySpec {
    pattern: string;
    extract(match: Parser.QueryMatch): string | undefined;
}
