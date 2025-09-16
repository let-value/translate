import type Parser from "tree-sitter";

export function buildTemplate(node: Parser.SyntaxNode): { text: string; error?: string } {
    const children = node.namedChildren.slice(1, -1);
    const strings: string[] = [""];
    const values: string[] = [];
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === "jsx_text") {
            let text = child.text;
            if (i === 0) text = text.replace(/^\s+/, "");
            if (i === children.length - 1) text = text.replace(/\s+$/, "");
            if (text) strings[strings.length - 1] += text;
        } else if (child.type === "jsx_expression") {
            const expr = child.namedChildren[0];
            if (!expr) {
                return { text: "", error: "Empty JSX expression" };
            }
            
            if (expr.type === "identifier") {
                values.push(expr.text);
                strings.push("");
            } else if (expr.type === "string") {
                strings[strings.length - 1] += expr.text.slice(1, -1);
            } else if (expr.type === "template_string") {
                // Check if it's a simple template string with no substitutions
                const hasSubstitutions = expr.children.some(c => c.type === "template_substitution");
                if (hasSubstitutions) {
                    return { text: "", error: "JSX expressions with template substitutions are not supported" };
                }
                // Extract the text content from the template string
                const content = expr.text.slice(1, -1); // Remove backticks
                strings[strings.length - 1] += content;
            } else {
                return { text: "", error: "JSX expressions must be simple identifiers, strings, or template literals" };
            }
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
        if (!expr) {
            return { text: "", error: "Empty JSX expression" };
        }
        
        if (expr.type === "identifier") {
            return { text: `\${${expr.text}}` };
        } else if (expr.type === "string") {
            return { text: expr.text.slice(1, -1) };
        } else if (expr.type === "template_string") {
            // Check if it's a simple template string with no substitutions
            const hasSubstitutions = expr.children.some(c => c.type === "template_substitution");
            if (hasSubstitutions) {
                return { text: "", error: "JSX expressions with template substitutions are not supported" };
            }
            // Extract the text content from the template string
            const content = expr.text.slice(1, -1); // Remove backticks
            return { text: content };
        } else {
            return { text: "", error: "JSX expressions must be simple identifiers, strings, or template literals" };
        }
    }
    return { text: "", error: "Unsupported JSX child" };
}
