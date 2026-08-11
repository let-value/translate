import type { Locale, Translator } from "@let-value/translate";
import { createContext } from "react";

type AnyTranslator = Translator<any>;

/**
 * A provider's link in the dehydration chain, walked from `useTranslations` so a
 * consumer can seed itself — and every translator it merges against — from the
 * server payload before it would otherwise suspend.
 *
 * Only providers with a lazily-loaded catalog add a link; sync ones are simply
 * skipped, so a child links straight to its nearest lazy ancestor.
 */
export interface DehydrationEntry {
    /** `useId()` of the provider, matching the inlined script's attribute. */
    id: string;
    translator: AnyTranslator;
    /** Sorted locale keys of the provider's `translations` prop. */
    keys: string[];
    parent: DehydrationEntry | undefined;
}

export const localeContext = createContext<Locale | undefined>(undefined);
export const translatorContext = createContext<AnyTranslator | undefined>(undefined);
export const dehydrationContext = createContext<DehydrationEntry | undefined>(undefined);
