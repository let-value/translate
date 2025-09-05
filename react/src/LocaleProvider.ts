import { createContext, createElement, type ReactNode } from "react";

export const localeContext = createContext<string | null>(null);

export interface LocaleProviderProps {
    locale: string;
    children?: ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
    return createElement(localeContext.Provider, { value: locale }, children);
}
