import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { Children, createContext, type ReactNode, useContext, useMemo } from "react";

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | TranslationLoader;

export const TranslatorContext = createContext<Translator | null>(null);

function mergeTranslations(translator: Translator, entries: Record<string, TranslationEntry>): void {
    const t = translator as unknown as {
        translations: Record<string, GetTextTranslations>;
        loaders: Record<string, TranslationLoader>;
    };
    for (const [locale, entry] of Object.entries(entries)) {
        if (typeof entry === "function") {
            t.loaders[locale] = entry;
        } else {
            t.translations[locale] = entry;
        }
    }
}

interface TranslationsProviderProps {
    locale: string;
    translations?: Record<string, TranslationEntry>;
    children?: ReactNode;
}

export function TranslationsProvider({ locale, translations = {}, children }: TranslationsProviderProps) {
    const parent = useContext(TranslatorContext);

    // biome-ignore lint/correctness/useExhaustiveDependencies: translator instance should persist
    const translator = useMemo(() => {
        return parent ?? new Translator(locale, translations);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parent]);

    useMemo(() => {
        mergeTranslations(translator, translations);
    }, [translator, translations]);

    const internal = translator as unknown as {
        locale: string;
        translations: Record<string, GetTextTranslations>;
    };

    if (internal.locale !== locale || !internal.translations[locale]) {
        // biome-ignore lint/correctness/useHookAtTopLevel: Suspense integration
        throw translator.useLocale(locale);
    }

    return <TranslatorContext.Provider value={translator}>{children}</TranslatorContext.Provider>;
}

export function useTranslations(locale?: string): Translator {
    const translator = useContext(TranslatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    if (locale) {
        const internal = translator as unknown as {
            locale: string;
            translations: Record<string, GetTextTranslations>;
        };
        if (internal.locale !== locale || !internal.translations[locale]) {
            // biome-ignore lint/correctness/useHookAtTopLevel: Suspense integration
            throw translator.useLocale(locale);
        }
    }

    return translator;
}

function buildMessageFromChildren(children: ReactNode): {
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

interface MessageProps {
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

interface PluralProps {
    number: number;
    forms: ReactNode[];
    context?: string;
}

export function Plural({ number, forms, context }: PluralProps) {
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

    return <>{result}</>;
}
