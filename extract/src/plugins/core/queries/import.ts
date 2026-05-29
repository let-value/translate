import type Parser from "@keqingmoe/tree-sitter";
import type { ImportReference } from "../../../plugin.ts";
import type { ImportQuerySpec } from "./types.ts";

function findImportParent(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
        if (
            current.type === "import_statement" ||
            current.type === "export_statement" ||
            current.type === "call_expression"
        ) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}

function isTypeOnly(parent: Parser.SyntaxNode | undefined) {
    if (!parent) {
        return false;
    }

    const text = parent.text.trimStart();
    return (
        /^import\s+type\b/.test(text) ||
        /^export\s+type\b/.test(text) ||
        /^export\s*{\s*type\b[^}]*}\s*from\b/.test(text)
    );
}

export const importQuery: ImportQuerySpec = {
    pattern: `
    [
      (import_statement
        source: (string (string_fragment) @import))
      (export_statement
        source: (string (string_fragment) @import))
      (call_expression
        function: (identifier) @func
        arguments: (arguments (string (string_fragment) @import))
        (#eq? @func "require"))
      (call_expression
        function: (member_expression
            object: (identifier) @obj
            property: (property_identifier) @method)
        arguments: (arguments (string (string_fragment) @import))
        (#eq? @obj "require")
        (#eq? @method "resolve"))
      (call_expression
        function: (import) @dynamic
        arguments: (arguments (string (string_fragment) @import)))
    ]
  `,
    extract(match: Parser.QueryMatch): ImportReference | undefined {
        const node = match.captures.find((c) => c.name === "import")?.node;
        if (!node) {
            return undefined;
        }

        const parent = findImportParent(node);
        return {
            spec: node.text,
            kind: match.captures.some((c) => c.name === "dynamic") ? "dynamic" : "static",
            typeOnly: isTypeOnly(parent),
        };
    },
};
