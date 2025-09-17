import type { PluralFormsLocale } from "./locales.ts";

type BaseConfiguration = {
    /**
     * Locale to use when a specific one is not provided
     * @see {@link PluralFormsLocale} for available locales
     */
    defaultLocale: PluralFormsLocale;
    /**
     * List of locales supported by the application
     * @see {@link PluralFormsLocale} for available locales
     */
    locales: PluralFormsLocale[];
    /**
     * Optional map of fallback locales
     * @deprecated not supported yet
     */
    fallback?: Partial<Record<PluralFormsLocale, PluralFormsLocale>>;
};

/**
 * Translations configuration interface. Consumers can extend this
 * interface via module augmentation to provide literal locale strings which
 * will then be used across the library for strict type checking.
 * @see click {@link BaseConfiguration} for the actual configuration object
 */
export interface Configuration extends BaseConfiguration {}

export type { PluralFormsLocale };

/**
 * A locale identifier
 * @see {@link PluralFormsLocale} for available locales
 */
export type Locale = Configuration & {};
