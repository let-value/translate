import type Parser from "tree-sitter";

export function buildTemplate(node: Parser.SyntaxNode): { text: string; error?: string } {
    const children = node.namedChildren.slice(1, -1);
    const strings: string[] = [""];
    const values: string[] = [];
    for (const child of children) {
        if (child.type === "jsx_text") {
            strings[strings.length - 1] += child.text;
        } else if (child.type === "jsx_expression") {
            const expr = child.namedChildren[0];
            if (!expr || expr.type !== "identifier") {
                return { text: "", error: "JSX expressions must be simple identifiers" };
            }
            values.push(expr.text);
            strings.push("");
        } else if (child.type === "string") {
            strings[strings.length - 1] += child.text.slice(1, -1);
        } else {
            return { text: "", error: "Unsupported JSX child" };
        }
    }
    let text = "";
    for (let i = 0; i < strings.length; i++) {
        text += strings[i];
        if (values[i]) {
            text += `\${${values[i]}}`;
        }
    }
    return { text };
}

export function buildAttrValue(node: Parser.SyntaxNode): { text: string; error?: string } {
    if (node.type === "string") {
        return { text: node.text.slice(1, -1) };
    }
    if (node.type === "jsx_expression") {
        const expr = node.namedChildren[0];
        if (!expr || expr.type !== "identifier") {
            return { text: "", error: "JSX expressions must be simple identifiers" };
        }
        return { text: `\${${expr.text}}` };
    }
    return { text: "", error: "Unsupported JSX child" };
}
