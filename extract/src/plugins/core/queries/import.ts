import type Parser from "@keqingmoe/tree-sitter";
import type { ImportQuerySpec } from "./types.ts";

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
        function: (import)
        arguments: (arguments (string (string_fragment) @import)))
    ]
  `,
    extract(match: Parser.QueryMatch): string | undefined {
        const node = match.captures.find((c) => c.name === "import")?.node;
        return node?.text;
    },
};
