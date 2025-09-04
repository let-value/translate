import Parser from "tree-sitter";
import { getParser } from "../../parse.ts";

interface AnyQuerySpec<T> {
    pattern: string;
    extract(match: Parser.QueryMatch): T | undefined;
}

export function getMatches<T>(source: string, path: string, spec: AnyQuerySpec<T>) {
    const { parser, language } = getParser(path);
    const tree = parser.parse(source);
    const query = new Parser.Query(language, spec.pattern);
    const matches = query
        .matches(tree.rootNode)
        .map((match) => spec.extract(match))
        .filter((match): match is T => !!match);

    return matches;
}
