import type Parser from "@keqingmoe/tree-sitter";
import { getComment } from "./comment.ts";
import type { EntrypointSpec } from "./types.ts";

const entrypointCommentPattern = /(?:^|\s)@?translate-entrypoint(?:\s|$)/;

export const entrypointQuery: EntrypointSpec = {
    pattern: `(comment) @comment`,
    extract(match: Parser.QueryMatch): boolean | undefined {
        return match.captures
            .filter((capture) => capture.name === "comment")
            .some((capture) => entrypointCommentPattern.test(getComment(capture.node)));
    },
};
