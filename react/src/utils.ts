import { Children, type ReactNode } from "react";

export function buildMessageFromChildren(children: ReactNode): {
    id: string;
    values: ReactNode[];
} {
    const values: ReactNode[] = [];
    let id = "";
    Children.forEach(children, (child) => {
        if (typeof child === "string" || typeof child === "number") {
            id += String(child);
        } else if (child != null) {
            const index = values.push(child) - 1;
            id += `\${${index}}`;
        }
    });
    return { id, values };
}
