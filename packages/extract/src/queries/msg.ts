import { withComment } from "./comment.ts";
import type { QuerySpec } from "./types.ts";

const msgCall = (args: string) => `(
  (call_expression
    function: (identifier) @func
    arguments: ${args}
  ) @call
  (#match? @func "^msg$")
)`;

export const msgStringQuery: QuerySpec = withComment({
	pattern: msgCall(`(arguments
    (string (string_fragment) @msgid)
)`),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")?.node;
		if (!call) {
			return undefined;
		}

		const msgid = match.captures.find((c) => c.name === "msgid")?.node.text;
		if (!msgid) {
			return undefined;
		}

		return {
			node: call,
			translation: {
				msgid,
				msgstr: [msgid],
			},
		};
	},
});

export const msgDescriptorQuery: QuerySpec = withComment({
	pattern: msgCall(`(arguments
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
)`),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")?.node;
		if (!call) {
			return undefined;
		}

		const id = match.captures.find((c) => c.name === "id")?.node.text;
		const message = match.captures.find((c) => c.name === "message")?.node.text;
		const msgid = id ?? message;
		if (!msgid) {
			return undefined;
		}

		const msgstr = message ?? id ?? "";

		return {
			node: call,
			translation: {
				msgid,
				msgstr: [msgstr],
			},
		};
	},
});

export const msgTemplateQuery: QuerySpec = withComment({
	pattern: msgCall(`(arguments
	(template_string) @tpl
)`),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")?.node;
		if (!call) {
			return undefined;
		}

		const tpl = match.captures.find((c) => c.name === "tpl")?.node;
		if (!tpl) {
			return undefined;
		}

		const text = tpl.text.slice(1, -1);

		return {
			node: call,
			translation: { msgid: text, msgstr: [text] },
		};
	},
});
