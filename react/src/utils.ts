import { Children, type ReactNode } from "react";

export type IsUnion<T, U = T> = (T extends unknown ? (x: T) => 0 : never) extends (x: U) => 0 ? false : true;

export type StrictStaticString<T extends string> = string extends T ? never : IsUnion<T> extends true ? never : T;

type StrictTuple<T extends readonly unknown[]> = T extends readonly [infer Head, ...infer Tail]
    ? readonly [StrictReactNode<Head>, ...StrictTuple<Tail>]
    : readonly [];

export type StrictReactNode<T> = T extends string
    ? StrictStaticString<T>
    : T extends readonly [infer Head, ...infer Tail]
      ? readonly [StrictReactNode<Head>, ...StrictTuple<Tail>]
      : T extends readonly (infer U)[]
        ? readonly StrictReactNode<U>[]
        : Exclude<T, string>;

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
