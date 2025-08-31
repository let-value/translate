import type { QuerySpec } from "./types";
import { withLeadingComment } from "./helpers";

const msgCall = (args: string) => `(
  (call_expression
    function: (identifier) @func
    arguments: ${args}
  ) @call
  (#match? @func "^msg$")
)`;

export const msgStringQuery: QuerySpec = {
	pattern: withLeadingComment(
		msgCall(`(arguments
    (string (string_fragment) @msgid)
  )`),
	),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")!.node;
		const msgid = match.captures.find((c) => c.name === "msgid")!.node.text;
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		return [{ node: call, translation: { msgid, msgstr: [] }, comment }];
	},
};

export const msgStringPairQuery: QuerySpec = {
	pattern: withLeadingComment(
		msgCall(`(arguments
    (string (string_fragment) @msgid)
    (string (string_fragment) @msgstr)
  )`),
	),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")!.node;
		const msgid = match.captures.find((c) => c.name === "msgid")!.node.text;
		const msgstrNode = match.captures.find((c) => c.name === "msgstr")!.node
			.text;
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		return [
			{ node: call, translation: { msgid, msgstr: [msgstrNode] }, comment },
		];
	},
};

export const msgDescriptorQuery: QuerySpec = {
	pattern: withLeadingComment(
		msgCall(`(arguments
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
	),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")!.node;
		const id = match.captures.find((c) => c.name === "id")?.node.text;
		const message = match.captures.find((c) => c.name === "message")?.node.text;
		const msgid = id ?? message;
		if (!msgid) return [];
		const msgstr = id && message ? [message] : [];
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		return [{ node: call, translation: { msgid, msgstr }, comment }];
	},
};

export const msgTemplateQuery: QuerySpec = {
	pattern: withLeadingComment(msgCall(`(template_string) @tpl`)),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")!.node;
		const tpl = match.captures.find((c) => c.name === "tpl")!.node;
		const text = tpl.text.slice(1, -1);
		const comment = match.captures.find((c) => c.name === "comment")?.node;
		return [{ node: call, translation: { msgid: text, msgstr: [] }, comment }];
	},
};
