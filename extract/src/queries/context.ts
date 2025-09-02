import { withComment } from "./comment.ts";
import { extractMessage, msgArgs } from "./msg.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const ctxCall = callPattern("context", `(arguments (string (string_fragment) @msgctxt))`)
    .replace(/@call/g, "@ctx")
    .replace(/@func/g, "@ctxfn");

export const contextMsgQuery: QuerySpec = withComment({
    pattern: `(
  (call_expression
    function: (member_expression
      object: ${ctxCall}
      property: (property_identifier) @func
    )
    arguments: ${msgArgs}
  ) @call
  (#eq? @func "msg")
)`,
    extract(match) {
        const result = extractMessage("context.msg")(match);
        const contextNode = match.captures.find((c) => c.name === "msgctxt")?.node;
        if (!result || !result.translation || !contextNode) {
            return result;
        }
        return {
            node: result.node,
            translation: {
                ...result.translation,
                msgctxt: contextNode.text,
            },
        };
    },
});

const msgCall = callPattern("msg", msgArgs, false).replace(/@call/g, "@msg").replace(/@func/g, "@msgfn");

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
