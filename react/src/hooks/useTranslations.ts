import type { LocaleTranslator, Translator } from "@let-value/translate";
import { cache, use } from "react";
import { localeContext, translatorContext } from "../context.ts";

const cachedFetchers = new WeakMap<
    Translator,
    (locale: string) => LocaleTranslator | Promise<LocaleTranslator>
>();

function getFetcher(translator: Translator) {
    let fetcher = cachedFetchers.get(translator);
    if (!fetcher) {
        fetcher = cache((locale: string) => translator.fetchLocale(locale));
        cachedFetchers.set(translator, fetcher);
    }
    return fetcher;
}

export function useTranslations(locale?: string): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? "unknown";
    const translator = use(translatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    const fetcher = getFetcher(translator);
    const resource = fetcher(requestedLocale);

    return resource instanceof Promise ? use(resource) : resource;
}
