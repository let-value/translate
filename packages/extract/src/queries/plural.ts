import { withComment } from "./comment.ts";
import { extractMessage, msgArgs } from "./msg.ts";
import type { QuerySpec } from "./types.ts";
import type Parser from "tree-sitter";

const pluralCall = (args: string) => `(
  (call_expression
    function: (identifier) @func
    arguments: (arguments ${args})
  ) @call
  (#eq? @func "plural")
)`;

function isDescendant(node: Parser.SyntaxNode, ancestor: Parser.SyntaxNode): boolean {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
        if (current.id === ancestor.id) return true;
        current = current.parent;
    }
    return false;
}

export const pluralQuery: QuerySpec = withComment({
    pattern: pluralCall(`
            (
                (call_expression
                    function: (identifier) @msgfn
                    arguments: [${msgArgs}]
                    (#eq? @msgfn "msg")
                ) @msg
                ("," )?
            )+
            (number) @n
        `),
    extract(match) {
        const call = match.captures.find((c) => c.name === "call")?.node;
        if (!call) {
            return undefined;
        }

        const msgNodes = match.captures.filter((c) => c.name === "msg").map((c) => c.node);

        const ids: string[] = [];
        const strs: string[] = [];

        for (const node of msgNodes) {
            const relevant = match.captures.filter((c) =>
                ["msgid", "id", "message", "tpl"].includes(c.name) && isDescendant(c.node, node)
            );

            const subMatch: Parser.QueryMatch = {
                pattern: 0,
                captures: [{ name: "call", node }, ...relevant],
            };

            const result = extractMessage("plural")(subMatch);
            if (!result) continue;
            if (result.error) {
                return { node: call, error: result.error };
            }
            if (result.translation) {
                ids.push(result.translation.msgid);
                strs.push(result.translation.msgstr[0] ?? "");
            }
        }

        if (ids.length === 0) {
            return undefined;
        }

        const translation = {
            msgid: ids[0],
            msgid_plural: ids[1],
            msgstr: strs,
        };

        return { node: call, translation };
    },
});

