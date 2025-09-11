import type { GetTextTranslations } from "gettext-parser";
import { getNPlurals, getPluralFunc } from "plural-forms";
import type { Locale } from "./config.ts";

// biome-ignore lint/suspicious/noExplicitAny: true
export type IsUnion<T, U = T> = (T extends any ? (x: T) => 0 : never) extends (x: U) => 0 ? false : true;

export type StrictStaticString<T extends string> = string extends T ? never : IsUnion<T> extends true ? never : T;

export function assert<T>(value: T, message?: string): asserts value is T {
    if (!value) {
        throw new Error(message || "Assertion failed");
    }
}

// biome-ignore lint/suspicious/noExplicitAny: true
export function memo<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map<string, ReturnType<T>>();
    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            // biome-ignore lint/style/noNonNullAssertion: true
            return cache.get(key)!;
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

export function substitute(text: string, values: unknown[] = []): string {
    const placeholders: string[] = [];

    return text.replace(/\$\{([^}]+)\}/g, (match, placeholder) => {
        if (/^\d+$/.test(placeholder)) {
            const index = Number(placeholder);
            return index < values.length ? String(values[index]) : match;
        }

        let index = placeholders.indexOf(placeholder);
        if (index === -1) {
            index = placeholders.length;
            placeholders.push(placeholder);
        }

        return index < values.length ? String(values[index]) : match;
    });
}

export function normalizeMessageId(msgid: string): string {
    const placeholders: string[] = [];
    return msgid.replace(/\$\{([^}]+)\}/g, (match, placeholder) => {
        if (/^\d+$/.test(placeholder)) {
            return match;
        }

        let index = placeholders.indexOf(placeholder);
        if (index === -1) {
            index = placeholders.length;
            placeholders.push(placeholder);
        }
        return `\${${index}}`;
    });
}

export function normalizeTranslations(translations: GetTextTranslations): GetTextTranslations {
    const normalized: GetTextTranslations = {
        ...translations,
        translations: {},
    };

    for (const [context, messages] of Object.entries(translations.translations)) {
        normalized.translations[context] = {};
        for (const [msgid, entry] of Object.entries(messages)) {
            const normalizedId = normalizeMessageId(msgid);
            normalized.translations[context][normalizedId] = entry;
        }
    }

    return normalized;
}

const defaultPluralFunc = (n: number) => (n !== 1 ? 1 : 0);

export const pluralFunc = memo(function pluralFunc(locale: Locale) {
    try {
        const length = Number(getNPlurals(locale));
        const pluralFunc = getPluralFunc(locale);
        const forms = Array.from({ length }, (_, i) => String(i));
        return (n: number) => {
            const idx = Number(pluralFunc(n, forms));
            if (idx < 0) return 0;
            if (idx >= length) return length - 1;
            return idx;
        };
    } catch {
        return defaultPluralFunc;
    }
});
