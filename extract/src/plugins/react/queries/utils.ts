import type Parser from "tree-sitter";

export function buildTemplate(node: Parser.SyntaxNode): { text: string; error?: string } {
    const source = node.tree.rootNode.text;
    const open = node.childForFieldName("open_tag");
    const close = node.childForFieldName("close_tag");
    const contentStart = open?.endIndex ?? node.startIndex;
    const contentEnd = close?.startIndex ?? node.endIndex;

    type Part =
        | { kind: "text"; text: string; raw: boolean }
        | { kind: "expr"; value: string };

    const parts: Part[] = [];
    let segmentStart = contentStart;

    const pushRawText = (endIndex: number) => {
        if (endIndex <= segmentStart) {
            segmentStart = Math.max(segmentStart, endIndex);
            return;
        }
        const text = source.slice(segmentStart, endIndex);
        if (text) {
            parts.push({ kind: "text", text, raw: true });
        }
        segmentStart = endIndex;
    };

    const children = node.namedChildren.slice(1, -1);
    for (const child of children) {
        if (child.type === "jsx_expression") {
            pushRawText(child.startIndex);
            const expr = child.namedChildren[0];
            if (!expr) {
                return { text: "", error: "Empty JSX expression" };
            }

            if (expr.type === "identifier") {
                parts.push({ kind: "expr", value: expr.text });
            } else if (expr.type === "string") {
                parts.push({ kind: "text", text: expr.text.slice(1, -1), raw: false });
            } else if (expr.type === "template_string") {
                const hasSubstitutions = expr.children.some(c => c.type === "template_substitution");
                if (hasSubstitutions) {
                    return { text: "", error: "JSX expressions with template substitutions are not supported" };
                }
                parts.push({ kind: "text", text: expr.text.slice(1, -1), raw: false });
            } else {
                return { text: "", error: "JSX expressions must be simple identifiers, strings, or template literals" };
            }
            segmentStart = child.endIndex;
        } else if (child.type === "string") {
            pushRawText(child.startIndex);
            parts.push({ kind: "text", text: child.text.slice(1, -1), raw: false });
            segmentStart = child.endIndex;
        } else if (child.type === "jsx_text" || child.type === "html_character_reference" || child.isError) {
            continue;
        } else {
            return { text: "", error: "Unsupported JSX child" };
        }
    }

    pushRawText(contentEnd);

    const firstRawIndex = parts.findIndex(part => part.kind === "text" && part.raw);
    if (firstRawIndex === 0) {
        const part = parts[firstRawIndex] as Extract<Part, { kind: "text" }>;
        part.text = part.text.replace(/^\s+/, "");
    }

    let lastRawIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (part.kind === "text" && part.raw) {
            lastRawIndex = i;
            break;
        }
    }
    if (lastRawIndex !== -1 && lastRawIndex === parts.length - 1) {
        const part = parts[lastRawIndex] as Extract<Part, { kind: "text" }>;
        part.text = part.text.replace(/\s+$/, "");
    }

    const strings: string[] = [""];
    const values: string[] = [];
    for (const part of parts) {
        if (part.kind === "text") {
            if (part.text) {
                strings[strings.length - 1] += part.text;
            }
        } else {
            values.push(part.value);
            strings.push("");
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
