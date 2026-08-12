import type { Locale, TranslationEntry } from "@let-value/translate";
import { createElement, Fragment, type ReactElement, type ReactNode, Suspense, use, useId, useMemo } from "react";
import { type DehydrationEntry, dehydrationContext, localeContext, translatorContext } from "../context.ts";
import { DEHYDRATION_ATTRIBUTE, dehydrate, isAsyncLocale, localeKeys, readPayload } from "../dehydration.ts";
import { getCachedTranslator, type TranslationsMap } from "../translatorCache.ts";

export interface TranslationsProviderProps {
    translations?: Partial<Record<Locale, TranslationEntry>>;
    children?: ReactNode;
}

const EMPTY_TRANSLATIONS: TranslationsMap = {};

interface DehydrationScriptProps {
    entry: DehydrationEntry;
    locale: Locale;
}

/**
 * Inlines the catalog for the active locale as a `<script type="application/json">`.
 *
 * Renders no children, which is the whole point: the provider wraps it in a
 * Suspense boundary that contains nothing of the app's, so awaiting the catalog
 * here can never intercept a fallback the app placed for its own content. The
 * app's boundaries — inside the provider or outside it — behave exactly as
 * written, and `useTranslations` still suspends where it always did.
 */
function DehydrationScript({ entry, locale }: DehydrationScriptProps) {
    // During hydration the payload is already in the document; re-render it
    // verbatim rather than re-encoding an equivalent one, and never call the
    // loader for a catalog the server already sent.
    let text = readPayload(entry, locale);

    if (!text) {
        const resource = entry.translator.fetchLocale(locale as never);
        if (resource instanceof Promise) {
            use(resource);
        }
        text = dehydrate(entry.keys, locale, entry.translator.dehydrate(locale));
    }

    if (!text) return null;

    return createElement("script", {
        type: "application/json",
        [DEHYDRATION_ATTRIBUTE]: entry.id,
        dangerouslySetInnerHTML: { __html: text },
    });
}

export function TranslationsProvider({
    translations = EMPTY_TRANSLATIONS,
    children,
}: TranslationsProviderProps): ReactElement {
    const id = useId();
    const parent = use(translatorContext);
    const parentEntry = use(dehydrationContext);
    const translator = getCachedTranslator(translations, parent);
    const locale = use(localeContext);

    const entry = useMemo<DehydrationEntry>(
        () => ({ id, translator, keys: localeKeys(translations), parent: parentEntry }),
        [id, translator, translations, parentEntry],
    );

    const provide = (inner: ReactNode) =>
        createElement(translatorContext.Provider, { value: translator }, inner) as ReactElement;

    if (!isAsyncLocale(translations, locale)) {
        return provide(children);
    }

    return provide(
        createElement(
            dehydrationContext.Provider,
            { value: entry },
            createElement(
                Fragment,
                null,
                createElement(
                    Suspense,
                    { fallback: null },
                    createElement(DehydrationScript, { entry, locale: locale as Locale }),
                ),
                children,
            ),
        ),
    );
}
