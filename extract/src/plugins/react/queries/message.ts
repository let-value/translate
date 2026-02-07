import type Parser from "@keqingmoe/tree-sitter";

import { withComment } from "../../core/queries/comment.ts";
import type { MessageMatch, QuerySpec, Translation } from "../../core/queries/types.ts";
import { buildAttrValue, buildTemplate } from "./utils.ts";

export const messageQuery: QuerySpec = withComment({
    pattern: `(
        [
            (jsx_element (jsx_opening_element name: (identifier) @name)) @call
            (jsx_self_closing_element name: (identifier) @name) @call
            (lexical_declaration 
                (variable_declarator 
                    value: [
                        (jsx_element (jsx_opening_element name: (identifier) @name)) @call
                        (jsx_self_closing_element name: (identifier) @name) @call
                    ]
                )
            )
        ]
        (#eq? @name "Message")
    )`,
    extract(match: Parser.QueryMatch): MessageMatch | undefined {
        const node = match.captures.find((c) => c.name === "call")?.node;
        if (!node) return undefined;
        let attrs: Parser.SyntaxNode[] = [];
        if (node.type === "jsx_element") {
            const open = node.childForFieldName("open_tag");
            if (open) attrs = open.namedChildren;
        } else if (node.type === "jsx_self_closing_element") {
            attrs = node.namedChildren.slice(1);
        }
        let msgctxt: string | undefined;
        let childValue: Parser.SyntaxNode | undefined;
        for (const child of attrs) {
            if (child.type !== "jsx_attribute") continue;
            const name = child.child(0);
            const value = child.child(child.childCount - 1);
            if (name?.text === "context" && value?.type === "string") {
                msgctxt = value.text.slice(1, -1);
            } else if (name?.text === "children" && value) {
                childValue = value;
            }
        }
        let text = "";
        let error: string | undefined;
        if (node.type === "jsx_element") {
            ({ text, error } = buildTemplate(node));
        } else if (childValue) {
            ({ text, error } = buildAttrValue(childValue));
        }
        if (error) {
            return { node, error };
        }
        if (!text) return undefined;
        const translation: Translation = {
            id: text,
            message: [text],
        };
        if (msgctxt) translation.context = msgctxt;
        return { node, translation };
    },
});
