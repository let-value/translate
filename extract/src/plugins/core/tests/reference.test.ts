import assert from "node:assert/strict";
import { test } from "node:test";
import type { SyntaxNode } from "@keqingmoe/tree-sitter";
import { getReference } from "../queries/comment.ts";

test("normalizes path separators", () => {
    const node = { startPosition: { row: 0, column: 0 } } as SyntaxNode;
    const ref = getReference(node, { path: "foo\\bar.ts" });
    assert(!ref.includes("\\"));
});
