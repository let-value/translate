import { withComment } from "./comment.ts";
import { msgArg, extractMessage } from "./msg.ts";
import { callPattern } from "./utils.ts";
import type { QuerySpec } from "./types.ts";

export const pgettextQuery: QuerySpec = withComment({
    pattern: callPattern(
        "pgettext",
        `(arguments (string (string_fragment) @msgctxt) "," ${msgArg})`,
    ),
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
