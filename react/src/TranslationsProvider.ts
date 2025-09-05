import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { createContext, createElement, type ReactNode, use, useMemo } from "react";

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
    translations?: Record<string, TranslationEntry>;
    children?: ReactNode;
}

export function TranslationsProvider({ translations = {}, children }: TranslationsProviderProps) {
    const parent = use(TranslatorContext);

    const translator = useMemo(() => {
        return parent ?? new Translator(translations);
    }, [parent, translations]);

    useMemo(() => {
        mergeTranslations(translator, translations);
    }, [translator, translations]);

    return createElement(TranslatorContext.Provider, { value: translator }, children);
}
