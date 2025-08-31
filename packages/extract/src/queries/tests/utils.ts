import Parser from "tree-sitter";
import { getParser } from "../../parse";
import type { QuerySpec } from "../types";

export function getMatches(source: string, path: string, spec: QuerySpec) {
    const { parser, language } = getParser(path);
    const tree = parser.parse(source);
    const query = new Parser.Query(language, spec.pattern);
    const matches = query.matches(tree.rootNode).flatMap(match => spec.extract(match)?.translation).filter(Boolean);

    return {
        tree,
        query: spec.pattern,
        matches,
    };
}