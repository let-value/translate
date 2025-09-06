import { createElement, type ReactNode } from "react";
import { localeContext } from "../context.ts";

export interface LocaleProviderProps {
    locale: string;
    children?: ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
    return createElement(localeContext.Provider, { value: locale }, children);
}
