import { withComment } from "./comment";
import type { QuerySpec } from "./types";

const msgCall = (args: string) => `(
  (call_expression
    function: (identifier) @func
    arguments: ${args}
  ) @call
  (#match? @func "^msg$")
)`;

export const msgStringQuery: QuerySpec = {
	pattern: withComment.pattern(
		msgCall(`(arguments
    (string (string_fragment) @msgid)
  )`),
	),
	extract(match) {
		const call = match.captures.find((c) => c.name === "call")?.node;
		if (!call) {
			return undefined;
		}

		const msgid = match.captures.find((c) => c.name === "msgid")?.node.text;
		if (!msgid) {
			return undefined;
		}

		const comment = withComment.extract(match);
		return {
			node: call,
			translation: {
				msgid,
				msgstr: [msgid],
				comments: {
					extracted: comment,
				},
			},
		};
	},
};

export const msgDescriptorQuery: QuerySpec = {
	pattern: withComment.pattern(
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
		const comment = withComment.extract(match);

		return {
			node: call,
			translation: {
				msgid,
				msgstr: [msgstr],
				comments: { extracted: comment },
			},
		};
	},
};

export const msgTemplateQuery: QuerySpec = {
	pattern: withComment.pattern(msgCall(`(template_string) @tpl`)),
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
		const comment = withComment.extract(match);

		return {
			node: call,
			translation: { msgid: text, msgstr: [] },
			comments: { extracted: comment },
		};
	},
};
