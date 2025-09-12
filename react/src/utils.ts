import { Children, Fragment, isValidElement, type PropsWithChildren, type ReactNode } from "react";

export function buildTemplateFromChildren(children: ReactNode): {
    strings: string[];
    values: ReactNode[];
} {
    function flatten(nodes: ReactNode): ReactNode[] {
        const result: ReactNode[] = [];
        Children.forEach(nodes, (child) => {
            if (isValidElement(child) && child.type === Fragment) {
                result.push(...flatten((child.props as PropsWithChildren).children));
            } else {
                result.push(child);
            }
        });
        return result;
    }

    const array = flatten(children);
    const strings: string[] = [""];
    const values: ReactNode[] = [];
    let expectValue = false;

    array.forEach((child) => {
        if (typeof child === "string") {
            if (expectValue) {
                values.push(child);
                strings.push("");
                expectValue = false;
            } else {
                strings[strings.length - 1] += child;
                expectValue = true;
            }
        } else if (typeof child === "number" || child != null) {
            values.push(child as ReactNode);
            strings.push("");
            expectValue = false;
        }
    });

    return { strings, values };
}
