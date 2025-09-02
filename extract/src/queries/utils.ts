import type Parser from "tree-sitter";

export const callPattern = (
    fnName: string,
    args: string,
    allowMember = true,
): string => `(
  (call_expression
    function: ${allowMember ? `[
      (identifier) @func
      (member_expression property: (property_identifier) @func)
    ]` : `(identifier) @func`}
    arguments: ${args}
  ) @call
  (#eq? @func "${fnName}")
)`;

export function isDescendant(
    node: Parser.SyntaxNode,
    ancestor: Parser.SyntaxNode,
): boolean {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
        if (current.id === ancestor.id) return true;
        current = current.parent;
    }
    return false;
}
