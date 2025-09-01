import fs from "node:fs";
import { extname, resolve } from "node:path";
import type { GetTextTranslation } from "gettext-parser";
import { memo } from "radash";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TS from "tree-sitter-typescript";
import { getReference } from "./queries/comment.ts";
import { queries } from "./queries/index.ts";
import type { Context } from "./queries/types.ts";

export interface ParseResult {
    messages: GetTextTranslation[];
    imports: string[];
}

function getLanguage(ext: string) {
    switch (ext) {
        case ".ts":
            return TS.typescript;
        case ".tsx":
            return TS.tsx;
        default:
            return JavaScript;
    }
}

const getCachedParser = memo(function getCachedParser(ext: string) {
    const parser = new Parser();
    const language = getLanguage(ext) as Parser.Language;
    parser.setLanguage(language);

    return { parser, language };
});

export function getParser(path: string) {
    const ext = extname(path);
    return getCachedParser(ext);
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

    const { parser, language } = getParser(path);
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
