import fs from "node:fs";
import { resolve } from "node:path";
import Parser from "tree-sitter";

import { getParser } from "../core/parse.ts";
import { getReference } from "../core/queries/comment.ts";

import { queries as coreQueries } from "../core/queries/index.ts";
import type { Context, Translation, Warning } from "../core/queries/types.ts";
import { queries as reactQueries } from "./queries/index.ts";

export interface ParseResult {
    translations: Translation[];
    warnings: Warning[];
}

export function parseFile(filePath: string): ParseResult {
    const path = resolve(filePath);
    const source = fs.readFileSync(path, "utf8");
    return parseSource(source, path);
}

export function parseSource(source: string, path: string): ParseResult {
    const context: Context = { path };
    const { parser, language } = getParser(path);
    const tree = parser.parse(source);

    const translations: Translation[] = [];
    const warnings: Warning[] = [];
    const seen = new Set<number>();

    for (const spec of [...coreQueries, ...reactQueries]) {
        const query = new Parser.Query(language, spec.pattern);
        for (const match of query.matches(tree.rootNode)) {
            const message = spec.extract(match);
            if (!message) continue;
            const { node, translation, error } = message;
            if (seen.has(node.id)) continue;
            seen.add(node.id);
            const reference = getReference(node, context);
            if (translation) {
                translations.push({
                    ...translation,
                    comments: {
                        ...translation.comments,
                        reference,
                    },
                });
            }
            if (error) {
                warnings.push({
                    error,
                    reference,
                });
            }
        }
    }

    return { translations, warnings };
}
