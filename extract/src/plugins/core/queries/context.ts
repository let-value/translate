import { withComment } from "./comment.ts";
import { extractMessage, messageArgs } from "./message.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const ctxCall = callPattern(
    "context",
    `[
  (arguments (string (string_fragment) @msgctxt))
  (template_string) @msgctxt
]`,
)
    .replace(/@call/g, "@ctx")
    .replace(/@func/g, "@ctxfn");

export const contextMsgQuery: QuerySpec = withComment({
    pattern: `(
  (call_expression
    function: (member_expression
      object: ${ctxCall}
      property: (property_identifier) @func
    )
    arguments: ${messageArgs}
  ) @call
  (#eq? @func "message")
)`,
    extract(match) {
        const result = extractMessage("context.message")(match);
        const contextNode = match.captures.find((c) => c.name === "msgctxt")?.node;
        if (!result || !result.translation || !contextNode) {
            return result;
        }

        if (contextNode.type === "template_string") {
            for (const child of contextNode.children) {
                if (child.type !== "template_substitution") {
                    continue;
                }

                const expr = child.namedChildren[0];
                if (!expr || expr.type !== "identifier") {
                    return {
                        node: contextNode,
                        error: "context() template expressions must be simple identifiers",
                    };
                }
            }
        }

        const contextText =
            contextNode.type === "template_string" ? contextNode.text.slice(1, -1) : contextNode.text;
        return {
            node: result.node,
            translation: {
                ...result.translation,
                context: contextText,
            },
        };
    },
});

const msgCall = callPattern("message", messageArgs, false).replace(/@call/g, "@msg").replace(/@func/g, "@msgfn");

export const contextPluralQuery: QuerySpec = withComment({
    pattern: `(
  (call_expression
    function: (member_expression
      object: ${ctxCall}
      property: (property_identifier) @func
    )
    arguments: (arguments (
      (${msgCall} ("," )?)+
      (number) @n
    ))
  ) @call
  (#eq? @func "plural")
)`,
    extract: extractPluralForms("context.plural"),
});

export const contextInvalidQuery: QuerySpec = withComment({
    pattern: ctxCall,
    extract(match) {
        const call = match.captures.find((c) => c.name === "ctx")?.node;
        if (!call) {
            return undefined;
        }

        const parent = call.parent;
        if (parent && parent.type === "member_expression" && parent.childForFieldName("object")?.id === call.id) {
            const property = parent.childForFieldName("property")?.text;
            const grandparent = parent.parent;
            if (
                grandparent &&
                grandparent.type === "call_expression" &&
                grandparent.childForFieldName("function")?.id === parent.id &&
                (property === "message" || property === "plural")
            ) {
                return undefined;
            }
        }

        return {
            node: call,
            error: "context() must be used with message() or plural() in the same expression",
        };
    },
});
