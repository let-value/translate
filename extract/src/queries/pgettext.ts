import { withComment } from "./comment.ts";
import { extractMessage } from "./msg.ts";
import type { QuerySpec } from "./types.ts";

const msgArg = `[
    (string (string_fragment) @msgid)
    (object
            (_)*
            (pair
                key: (property_identifier) @id_key
                value: (string (string_fragment) @id)
                (#eq? @id_key "id")
            )?
            (_)*
            (pair
                key: (property_identifier) @msg_key
                value: (string (string_fragment) @message)
                (#eq? @msg_key "message")
            )?
            (_)*
    )
    (template_string) @tpl
]`;

const pgettextCall = (arg: string) => `(
  (call_expression
    function: [
      (identifier) @func
      (member_expression property: (property_identifier) @func)
    ]
    arguments: (arguments
        (string (string_fragment) @msgctxt)
        ","
        ${arg}
    )
  ) @call
  (#eq? @func "pgettext")
)`;

export const pgettextQuery: QuerySpec = withComment({
    pattern: pgettextCall(msgArg),
    extract(match) {
        const result = extractMessage("pgettext")(match);
        const contextNode = match.captures.find((c) => c.name === "msgctxt")?.node;
        if (!result || !contextNode || !result.translation) {
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
