import type { QuerySpec } from "./types";
import { withLeadingComment } from "./helpers";

const callPattern = `(
  (call_expression
    function: (identifier) @func
    arguments: (arguments (string (string_fragment) @msgid))
  ) @call
  (#match? @func "^(t|ngettext)$")
)`;

export const tQuery: QuerySpec = {
	pattern: withLeadingComment(callPattern),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")!.node;
		const msgidNode = match.captures.find((c) => c.name === "msgid")!.node;
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		return [
			{
				node: call,
				translation: { msgid: msgidNode.text, msgstr: [] },
				comment,
			},
		];
	},
};
