import { message } from "@let-value/translate";
import { createElement, Fragment, type ReactNode } from "react";

import { useTranslations } from "../hooks/useTranslations.ts";
import { buildTemplateFromChildren } from "../utils.ts";

export interface MessageProps {
    context?: string;
    children: ReactNode;
}

export function Message({ context, children }: MessageProps) {
    const translator = useTranslations();
    const { strings, values } = buildTemplateFromChildren(children);

    if (values.length === 0) {
        const input = strings.join("");
        if (context) {
            return translator.context(context as "").message(input as never);
        }
        return translator.message(input as never);
    }

    const tokens = values.map((_, i) => `\u0000${i}\u0000`);
    const built = message(strings as unknown as TemplateStringsArray, ...tokens);
    const translated = context ? translator.context(context as "").message(built) : translator.message(built);

    // biome-ignore lint/suspicious/noControlCharactersInRegex: using null separators
    const parts = translated.split(/\u0000(\d+)\u0000/);
    const result: ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 2) {
        result.push(parts[i]);
        const idx = parts[i + 1];
        if (idx !== undefined) {
            result.push(values[Number(idx)]);
        }
    }

    return createElement(Fragment, null, ...result);
}
