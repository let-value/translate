import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { createContext, createElement, type ReactNode, useContext, useMemo } from "react";

export const TranslatorContext = createContext<Translator | null>(null);

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | TranslationLoader;

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

export interface TranslationsProviderProps {
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

    return createElement(TranslatorContext.Provider, { value: translator }, children);
}
