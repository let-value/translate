import type { LocaleTranslator } from "@let-value/translate";
import { use } from "react";
import { localeContext, translatorContext } from "../context.ts";

export function useTranslations(locale?: string): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? "unknown";
    const translator = use(translatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    const resource = translator.fetchLocale(requestedLocale);

    return resource instanceof Promise ? use(resource) : resource;
}
