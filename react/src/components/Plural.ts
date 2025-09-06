import { message, plural } from "@let-value/translate";
import { createElement, Fragment, type ReactNode } from "react";

import { useTranslations } from "../hooks/useTranslations.ts";
import { buildTemplateFromChildren } from "../utils.ts";

export interface PluralProps {
    number: number;
    forms: readonly ReactNode[];
    context?: string;
}

export function Plural({ number, forms, context }: PluralProps) {
    const translator = useTranslations();

    const built = forms.map((child, i) => {
        const { strings, values } = buildTemplateFromChildren(child);
        const tokens = values.map((_, j) => `\u0000${i}-${j}\u0000`);
        return { message: message(strings as unknown as TemplateStringsArray, ...tokens), values };
    });

    const messages = built.map((b) => b.message);
    const input = plural(...messages, number);

    const translated = context ? translator.context(context as "").plural(input) : translator.plural(input);

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
