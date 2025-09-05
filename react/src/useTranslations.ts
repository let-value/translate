import type { LocaleTranslator } from "@let-value/translate";
import { use } from "react";
import { localeContext } from "./LocaleProvider.ts";
import { TranslatorContext } from "./TranslationsProvider.ts";

export function useTranslations(locale?: string): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? "unknown";

    const translator = use(TranslatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    return use(translator.fetchLocale(requestedLocale));
}
