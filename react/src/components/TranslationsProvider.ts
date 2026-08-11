import type { Locale, TranslationEntry, Translator } from "@let-value/translate";
import { createElement, Fragment, type ReactElement, type ReactNode, use, useId } from "react";
import { localeContext, translatorContext } from "../context.ts";
import { DEHYDRATION_ATTRIBUTE, dehydrate, hydrateFromDocument, isAsyncLocale } from "../dehydration.ts";
import { getCachedTranslator, type TranslationsMap } from "../translatorCache.ts";

export interface TranslationsProviderProps {
    translations?: Partial<Record<Locale, TranslationEntry>>;
    children?: ReactNode;
}

const EMPTY_TRANSLATIONS: TranslationsMap = {};

interface DehydrationGateProps {
    id: string;
    translator: Translator;
    translations: TranslationsMap;
    locale: Locale;
    /** Payload read back from the document during hydration, if there was one. */
    payload: string | undefined;
    children?: ReactNode;
}

/**
 * Resolves the active locale before rendering `children`, then inlines the
 * resolved catalog next to them.
 *
 * Suspends into whatever boundary the app already put above the provider — this
 * component deliberately renders no `Suspense` of its own, so the app keeps full
 * control over which fallback shows. Awaiting here rather than in
 * `useTranslations` is what makes the payload usable: the script and the markup
 * it belongs to land in the same boundary, so the client cannot hydrate that
 * subtree before the catalog is in the DOM.
 */
function DehydrationGate({ id, translator, translations, locale, payload, children }: DehydrationGateProps) {
    const resource = translator.fetchLocale(locale as never);
    if (resource instanceof Promise) {
        use(resource);
    }

    // Prefer the payload the server sent, so a hydrating render reproduces it
    // byte-for-byte instead of re-encoding an equivalent one.
    const text = payload ?? dehydrate(translations, locale, translator.dehydrate(locale));

    const script = text
        ? createElement("script", {
              type: "application/json",
              [DEHYDRATION_ATTRIBUTE]: id,
              dangerouslySetInnerHTML: { __html: text },
          })
        : null;

    return createElement(Fragment, null, script, children);
}

export function TranslationsProvider({
    translations = EMPTY_TRANSLATIONS,
    children,
}: TranslationsProviderProps): ReactElement {
    const id = useId();
    const parent = use(translatorContext);
    const translator = getCachedTranslator(translations, parent);
    const locale = use(localeContext);

    if (!isAsyncLocale(translations, locale)) {
        return createElement(translatorContext.Provider, { value: translator }, children);
    }

    const payload = hydrateFromDocument(id, translator, translations, locale);

    return createElement(
        translatorContext.Provider,
        { value: translator },
        createElement(DehydrationGate, { id, translator, translations, locale: locale as Locale, payload }, children),
    );
}
