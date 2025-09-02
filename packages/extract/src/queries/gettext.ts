import { withComment } from "./comment.ts";
import { extractMessage, msgArgs } from "./msg.ts";
import type { QuerySpec } from "./types.ts";

const gettextCall = (args: string) => `(
  (call_expression
    function: [
      (identifier) @func
      (member_expression property: (property_identifier) @func)
    ]
    arguments: ${args}
  ) @call
  (#eq? @func "gettext")
)`;

export const gettextQuery: QuerySpec = withComment({
    pattern: gettextCall(`[${msgArgs}
        (arguments (
            call_expression
                function: (identifier) @msgfn
                arguments: (template_string) @tpl
                (#eq? @msgfn "msg")
        ))
    ]`),
    extract: extractMessage("gettext"),
});

const allowed = new Set(["string", "object", "template_string", "identifier", "call_expression"]);

export const gettextInvalidQuery: QuerySpec = {
    pattern: gettextCall(`(arguments (_) @arg)`),
    extract(match) {
        const call = match.captures.find((c) => c.name === "call")?.node;
        const node = match.captures.find((c) => c.name === "arg")?.node;

        if (!call || !node) {
            return undefined;
        }

        if (allowed.has(node.type)) {
            return undefined;
        }

        return {
            node,
            error: "gettext() argument must be a string literal, object literal, or template literal",
        };
    },
};
