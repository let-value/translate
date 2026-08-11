import type { Locale, TranslationEntry } from "@let-value/translate";
import { createElement, type ReactNode, use, type ReactElement } from "react";
import { translatorContext } from "../context.ts";
import { getCachedTranslator, type TranslationsMap } from "../translatorCache.ts";

export interface TranslationsProviderProps {
    translations?: Partial<Record<Locale, TranslationEntry>>;
    children?: ReactNode;
}

const EMPTY_TRANSLATIONS: TranslationsMap = {};

export function TranslationsProvider({
    translations = EMPTY_TRANSLATIONS,
    children,
}: TranslationsProviderProps): ReactElement {
    const parent = use(translatorContext);
    const translator = getCachedTranslator(translations, parent);
    return createElement(translatorContext.Provider, { value: translator }, children);
}
