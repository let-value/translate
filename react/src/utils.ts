import { Children, type ReactNode } from "react";

export function buildTemplateFromChildren(children: ReactNode): {
    strings: string[];
    values: ReactNode[];
} {
    const strings: string[] = [""];
    const values: ReactNode[] = [];
    Children.forEach(children, (child) => {
        if (typeof child === "string" || typeof child === "number") {
            strings[strings.length - 1] += String(child);
        } else if (child != null) {
            values.push(child);
            strings.push("");
        }
    });
    return { strings, values };
}
