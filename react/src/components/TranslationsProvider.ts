import type { Locale } from "@let-value/translate";
import { createElement, type ReactNode, use } from "react";
import { translatorContext } from "../context.ts";
import { type TranslationEntry, type TranslationsMap, getCachedTranslator } from "../translatorCache.ts";

export interface TranslationsProviderProps {
    translations?: Partial<Record<Locale, TranslationEntry>>;
    children?: ReactNode;
}

const EMPTY_TRANSLATIONS: TranslationsMap = {};

export function TranslationsProvider({ translations = EMPTY_TRANSLATIONS, children }: TranslationsProviderProps) {
    const parent = use(translatorContext);
    const translator = getCachedTranslator(translations, parent);
    return createElement(translatorContext.Provider, { value: translator }, children);
}
