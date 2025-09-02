import Parser from "tree-sitter";
import { getParser } from "../../parse.ts";
import type { QuerySpec } from "../types.ts";

export function getMatches(source: string, path: string, spec: QuerySpec) {
    const { parser, language } = getParser(path);
    const tree = parser.parse(source);

    const query = new Parser.Query(language, spec.pattern);
    const matches = query
        .matches(tree.rootNode)
        .flatMap((match) => spec.extract(match))
        .filter((match) => !!match);

    return matches;
}
