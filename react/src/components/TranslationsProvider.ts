import type { Locale } from "@let-value/translate";
import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { createElement, type ReactNode, Suspense, use, useMemo } from "react";
import { translatorContext } from "../context.ts";

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | TranslationLoader;

export interface TranslationsProviderProps {
    translations?: Partial<Record<Locale, TranslationEntry>>;
    children?: ReactNode;
}

export function TranslationsProvider({ translations = {}, children }: TranslationsProviderProps) {
    const parent = use(translatorContext);

    const translator = useMemo(() => {
        // Create a nested Translator that inherits from parent and merges entries
        return new Translator(translations, parent);
    }, [parent, translations]);

    return createElement(translatorContext.Provider, { value: translator }, createElement(Suspense, null, children));
}
