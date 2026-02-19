import fs from "node:fs";
import { extname, resolve } from "node:path";

import Parser from "@keqingmoe/tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TS from "tree-sitter-typescript";

import { getReference } from "./queries/comment.ts";
import { entrypointQuery } from "./queries/entrypoint.ts";
import { importQuery } from "./queries/import.ts";
import { queries } from "./queries/index.ts";
import type { Context, Translation, Warning } from "./queries/types.ts";

export interface ParseResult {
    translations: Translation[];
    imports: string[];
    warnings: Warning[];
    entrypoint: boolean;
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

const parserCache = new Map<string, { parser: Parser; language: Parser.Language }>();
const queryCache = new WeakMap<Parser.Language, Map<string, Parser.Query>>();

function getCachedParser(ext: string) {
    let cached = parserCache.get(ext);
    if (!cached) {
        const parser = new Parser();
        const language = getLanguage(ext) as Parser.Language;
        parser.setLanguage(language);
        cached = { parser, language };
        parserCache.set(ext, cached);
    }
    return cached;
}

function getCachedQuery(language: Parser.Language, pattern: string) {
    let cache = queryCache.get(language);
    if (!cache) {
        cache = new Map();
        queryCache.set(language, cache);
    }

    let query = cache.get(pattern);
    if (!query) {
        query = new Parser.Query(language, pattern);
        cache.set(pattern, query);
    }

    return query;
}

export function getParser(path: string) {
    const ext = extname(path);
    return getCachedParser(ext);
}

export function getQuery(language: Parser.Language, pattern: string) {
    return getCachedQuery(language, pattern);
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

    const commentQuery = getCachedQuery(language, entrypointQuery.pattern);
    const entrypoint = commentQuery.matches(tree.rootNode).some(entrypointQuery.extract);

    const translations: Translation[] = [];
    const warnings: Warning[] = [];
    const imports: string[] = [];

    const seen = new Set<number>();

    for (const spec of queries) {
        const query = getCachedQuery(language, spec.pattern);
        for (const match of query.matches(tree.rootNode)) {
            const message = spec.extract(match);
            if (!message) {
                continue;
            }

            const { node, translation, error } = message;
            if (seen.has(node.id)) {
                continue;
            }
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

    const importTreeQuery = getCachedQuery(language, importQuery.pattern);
    for (const match of importTreeQuery.matches(tree.rootNode)) {
        const imp = importQuery.extract(match);
        if (imp) {
            imports.push(imp);
        }
    }

    return { translations, imports, warnings, entrypoint };
}
