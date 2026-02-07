import type Parser from "@keqingmoe/tree-sitter";

import { withComment } from "../../core/queries/comment.ts";
import type { MessageMatch, QuerySpec, Translation } from "../../core/queries/types.ts";
import { buildTemplate } from "./utils.ts";

function parseForms(node: Parser.SyntaxNode): { forms: string[]; error?: string } {
    const forms: string[] = [];
    if (node.type === "jsx_expression") {
        const arr = node.namedChildren[0];
        if (!arr || arr.type !== "array") {
            return { forms: [], error: "Plural forms must be an array" };
        }
        for (const el of arr.namedChildren) {
            if (el.type === "jsx_element" || el.type === "jsx_fragment") {
                const { text, error } = buildTemplate(el);
                if (error) return { forms: [], error };
                forms.push(text);
            } else if (el.type === "string") {
                forms.push(el.text.slice(1, -1));
            } else {
                return { forms: [], error: "Unsupported plural form" };
            }
        }
    }
    return { forms };
}

export const pluralQuery: QuerySpec = withComment({
    pattern: `(
        [
            (jsx_element (jsx_opening_element name: (identifier) @name))
            (jsx_self_closing_element name: (identifier) @name)
        ] @call
        (#eq? @name "Plural")
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
        let formsNode: Parser.SyntaxNode | null | undefined;
        for (const child of attrs) {
            if (child.type !== "jsx_attribute") continue;
            const name = child.child(0);
            const value = child.child(child.childCount - 1);
            if (name?.text === "context" && value?.type === "string") {
                msgctxt = value.text.slice(1, -1);
            } else if (name?.text === "forms" && value) {
                formsNode = value;
            }
        }
        if (!formsNode) return undefined;
        const { forms, error } = parseForms(formsNode);
        if (error) {
            return { node, error };
        }
        if (forms.length === 0) return undefined;
        const translation: Translation = {
            id: forms[0],
            plural: forms[1],
            message: forms,
        };
        if (msgctxt) translation.context = msgctxt;
        return { node, translation };
    },
});
