import type { Locale } from "@let-value/translate";
import { createElement, type ReactNode } from "react";
import { localeContext } from "../context.ts";

export interface LocaleProviderProps {
    locale: Locale;
    children?: ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
    return createElement(localeContext.Provider, { value: locale }, children);
}
