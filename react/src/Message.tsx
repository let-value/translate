import type { ReactNode } from "react";

import { useTranslations } from "./useTranslations.tsx";
import { buildMessageFromChildren } from "./utils.ts";

export interface MessageProps {
    context?: string;
    children: ReactNode;
}

export function Message({ context, children }: MessageProps) {
    const translator = useTranslations();
    const { id, values } = buildMessageFromChildren(children);

    if (values.length === 0) {
        if (context) {
            return translator.pgettext({ context, id: { msgid: id, msgstr: id } });
        }
        return translator.message({ msgid: id, msgstr: id });
    }

    const tokens = values.map((_, i) => `\u0000${i}\u0000`);
    const input = { msgid: id, msgstr: id, values: tokens };
    const translated = context ? translator.pgettext({ context, id: input }) : translator.message(input);

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

    return <>{result}</>;
}
