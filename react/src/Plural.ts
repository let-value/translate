import { createElement, Fragment, type ReactNode } from "react";

import { useTranslations } from "./useTranslations.ts";
import { buildMessageFromChildren, type StrictReactNode } from "./utils.ts";

export interface PluralProps<F extends readonly ReactNode[]> {
    number: number;
    forms: StrictReactNode<F>;
    context?: string;
}

export function Plural<F extends readonly ReactNode[]>({ number, forms, context }: PluralProps<F>) {
    const translator = useTranslations();

    const built = forms.map((child, i) => {
        const { id, values } = buildMessageFromChildren(child);
        const tokens = values.map((_, j) => `\u0000${i}-${j}\u0000`);
        return { message: { msgid: id, msgstr: id, values: tokens }, values };
    });

    const messages = built.map((b) => b.message);
    const input = { forms: messages, n: number };

    const translated = context ? translator.npgettext({ context, id: input }) : translator.plural(input);

    // biome-ignore lint/suspicious/noControlCharactersInRegex: using null separators
    const parts = translated.split(/\u0000(\d+)-(\d+)\u0000/);
    const result: ReactNode[] = [];
    for (let i = 0; i < parts.length; ) {
        result.push(parts[i]);
        if (i + 2 < parts.length) {
            const formIndex = Number(parts[i + 1]);
            const valueIndex = Number(parts[i + 2]);
            result.push(built[formIndex].values[valueIndex]);
        }
        i += 3;
    }

    return createElement(Fragment, null, ...result);
}
