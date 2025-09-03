import { withComment } from "./comment.ts";
import { extractMessage, messageArgs } from "./message.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

export const gettextQuery: QuerySpec = withComment({
    pattern: callPattern("gettext", messageArgs),
    extract: extractMessage("gettext"),
});

const allowed = new Set(["string", "object", "template_string", "identifier", "call_expression"]);

export const gettextInvalidQuery: QuerySpec = {
    pattern: callPattern("gettext", "(arguments (_) @arg)"),
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
