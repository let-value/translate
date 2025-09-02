import type Parser from "tree-sitter";
import { withComment } from "./comment.ts";
import type { MessageMatch, QuerySpec } from "./types.ts";

const msgCall = (args: string) => `(
  (call_expression
    function: [
        (identifier) @func
        (member_expression property: (property_identifier) @func)
    ]
    arguments: ${args}
  ) @call
  (#eq? @func "msg")
)`;

const notInPlural = (query: QuerySpec): QuerySpec => ({
    pattern: query.pattern,
    extract(match) {
        const result = query.extract(match);
        if (!result?.node) {
            return result;
        }

        let parent = result.node.parent;

        if (parent && parent.type === "arguments") {
            parent = parent.parent;
        }

        if (
            parent &&
            parent.type === "call_expression" &&
            parent.childForFieldName("function")?.type === "identifier" &&
            parent.childForFieldName("function")?.text === "plural"
        ) {
            return undefined;
        }

        return result;
    },
});

export const msgArgs = `
    (arguments
        [
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
        ]
    )
    (template_string) @tpl
`;

export const extractMessage =
    (name: string) =>
    (match: Parser.QueryMatch): MessageMatch | undefined => {
        const node = match.captures.find((c) => c.name === "call")?.node;
        if (!node) {
            return undefined;
        }

        const msgid = match.captures.find((c) => c.name === "msgid")?.node.text;
        if (msgid) {
            return {
                node,
                translation: {
                    msgid,
                    msgstr: [msgid],
                },
            };
        }

        const tpl = match.captures.find((c) => c.name === "tpl")?.node;
        if (tpl) {
            for (const child of tpl.children) {
                if (child.type !== "template_substitution") {
                    continue;
                }

                const expr = child.namedChildren[0];
                if (!expr || expr.type !== "identifier") {
                    return {
                        node,
                        error: `${name}() template expressions must be simple identifiers`,
                    };
                }
            }

            const text = tpl.text.slice(1, -1);

            return {
                node,
                translation: { msgid: text, msgstr: [text] },
            };
        }

        const id = match.captures.find((c) => c.name === "id")?.node.text;
        const message = match.captures.find((c) => c.name === "message")?.node.text;
        const msgId = id ?? message;
        if (!msgId) {
            return undefined;
        }

        const msgstr = message ?? id ?? "";

        return {
            node,
            translation: {
                msgid: msgId,
                msgstr: [msgstr],
            },
        };
    };

export const msgQuery: QuerySpec = notInPlural(
    withComment({
        pattern: msgCall(`[${msgArgs}]`),
        extract: extractMessage("msg"),
    }),
);

const allowed = new Set(["string", "object", "template_string"]);

export const msgInvalidQuery: QuerySpec = notInPlural({
    pattern: msgCall(`(arguments (_) @arg)`),
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
            error: "msg() argument must be a string literal, object literal, or template literal",
        };
    },
});
