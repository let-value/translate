import { withComment } from "./comment.ts";
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

export const gettextStringQuery: QuerySpec = withComment({
    pattern: gettextCall(`(arguments
    (string (string_fragment) @msgid)
)`),
    extract(match) {
        const node = match.captures.find((c) => c.name === "call")?.node;
        if (!node) {
            return undefined;
        }

        const msgid = match.captures.find((c) => c.name === "msgid")?.node.text;
        if (!msgid) {
            return undefined;
        }

        return {
            node,
            translation: {
                msgid,
                msgstr: [msgid],
            },
        };
    },
});

export const gettextDescriptorQuery: QuerySpec = withComment({
    pattern: gettextCall(`(arguments
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
        const node = match.captures.find((c) => c.name === "call")?.node;
        if (!node) {
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
            node,
            translation: {
                msgid,
                msgstr: [msgstr],
            },
        };
    },
});

export const gettextTemplateQuery: QuerySpec = withComment({
    pattern: gettextCall(`[
        (template_string) @tpl
        (arguments (
            call_expression
                function: (identifier) @msgfn
                arguments: (template_string) @tpl
                (#eq? @msgfn "msg")
        ))
    ]`),
    extract(match) {
        const node = match.captures.find((c) => c.name === "call")?.node;
        if (!node) {
            return undefined;
        }

        const tpl = match.captures.find((c) => c.name === "tpl")?.node;
        if (!tpl) {
            return undefined;
        }

        for (const child of tpl.children) {
            if (child.type !== "template_substitution") {
                continue;
            }

            const expr = child.namedChildren[0];
            if (!expr || expr.type !== "identifier") {
                return {
                    node,
                    error: "gettext() template expressions must be simple identifiers",
                };
            }
        }

        const text = tpl.text.slice(1, -1);

        return {
            node,
            translation: { msgid: text, msgstr: [text] },
        };
    },
});

const allowed = new Set([
    "string",
    "object",
    "template_string",
    "identifier",
    "call_expression",
]);

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

