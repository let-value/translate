import type { LocaleTranslator, Translator } from "@let-value/translate";
import { use } from "react";
import { localeContext, translatorContext } from "../context.ts";

const localeCaches = new WeakMap<Translator, Map<string, LocaleTranslator | Promise<LocaleTranslator>>>();

function getLocale(translator: Translator, locale: string): LocaleTranslator | Promise<LocaleTranslator> {
    let translatorCache = localeCaches.get(translator);
    if (!translatorCache) {
        translatorCache = new Map();
        localeCaches.set(translator, translatorCache);
    }

    const cached = translatorCache.get(locale);
    if (cached) {
        return cached;
    }

    const result = translator.fetchLocale(locale);
    translatorCache.set(locale, result);
    if (result instanceof Promise) {
        result.then((value) => {
            translatorCache.set(locale, value);
            return value;
        });
    }
    return result;
}

export function useTranslations(locale?: string): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? "unknown";
    const translator = use(translatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    const resource = getLocale(translator, requestedLocale);
    return resource instanceof Promise ? use(resource) : resource;
}
