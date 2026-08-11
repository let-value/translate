import type { Locale, Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import type { TranslationsMap } from "./translatorCache.ts";

/**
 * Attribute that marks an inlined catalog. The value is the `useId()` of the
 * `TranslationsProvider` that emitted it — React guarantees that id is identical
 * between the server render and the hydration render of the same tree position.
 */
export const DEHYDRATION_ATTRIBUTE = "data-translations";

interface DehydratedPayload {
    /** Sorted locale keys of the provider's `translations` prop. */
    k: string[];
    /** Locale the catalog was resolved for. */
    l: string;
    /** The catalog itself. */
    c: GetTextTranslations;
}

/** Locale keys of a `translations` map, sorted so server and client agree. */
export function localeKeys(translations: TranslationsMap): string[] {
    return Object.keys(translations).sort();
}

/** True when resolving `locale` from `translations` requires awaiting a loader. */
export function isAsyncLocale(translations: TranslationsMap, locale: Locale | undefined): boolean {
    if (!locale) return false;
    const entry = translations[locale];
    if (!entry) return false;
    return typeof entry === "function" || "then" in entry;
}

/**
 * `</script` is the only sequence that can terminate the script element early;
 * escaping `<` as a JSON unicode escape keeps the text byte-identical to what
 * `textContent` yields on the client, so hydration matches exactly.
 */
function encode(payload: DehydratedPayload): string {
    return JSON.stringify(payload).replaceAll("<", "\\u003c");
}

export function dehydrate(
    translations: TranslationsMap,
    locale: Locale,
    catalog: GetTextTranslations | undefined,
): string | undefined {
    if (!catalog) return undefined;
    return encode({ k: localeKeys(translations), l: locale, c: catalog });
}

function findScript(id: string): Element | null {
    if (typeof document === "undefined") return null;
    return document.querySelector(`script[${DEHYDRATION_ATTRIBUTE}="${id}"]`);
}

/**
 * Seed `translator` from the catalog the server inlined for this provider.
 *
 * Returns the raw payload text when one was found, so the provider can render an
 * identical `<script>` back and keep hydration byte-for-byte stable.
 *
 * `useId` is stable across a server render and its hydration, but a provider
 * mounted later by client-side navigation gets a fresh id that could collide with
 * an id from the server tree. The locale keys in the payload guard against that:
 * a mismatch is treated as a miss, never as a match.
 */
export function hydrateFromDocument(
    id: string,
    translator: Translator,
    translations: TranslationsMap,
    locale: Locale | undefined,
): string | undefined {
    if (!locale) return undefined;

    const script = findScript(id);
    const text = script?.textContent;
    if (!text) return undefined;

    let payload: DehydratedPayload;
    try {
        payload = JSON.parse(text) as DehydratedPayload;
    } catch {
        return undefined;
    }

    if (payload.l !== locale) return undefined;

    const keys = localeKeys(translations);
    if (payload.k.length !== keys.length || payload.k.some((key, index) => key !== keys[index])) {
        return undefined;
    }

    translator.prime(locale, payload.c);
    return text;
}
