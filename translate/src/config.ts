import type { PluralFormsLocale } from "plural-forms";

export interface Configuration {
    /**
     * Locale to use when a specific one is not provided.
     */
    defaultLocale: PluralFormsLocale;
    /**
     * List of locales supported by the application. Consumers can augment this
     * interface via module augmentation to provide literal locale strings which
     * will then be used across the library for strict type checking.
     */
    locales: readonly PluralFormsLocale[];
    /**
     * Optional map of fallback locales.
     */
    fallback?: Partial<Record<PluralFormsLocale, PluralFormsLocale>>;
}

export type Locale = Configuration["locales"][number];
