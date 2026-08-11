import type { Locale, Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import type { DehydrationEntry } from "./context.ts";
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
    keys: string[],
    locale: Locale,
    catalog: GetTextTranslations | undefined,
): string | undefined {
    if (!catalog) return undefined;
    return encode({ k: keys, l: locale, c: catalog });
}

/** Locales already seeded from the document, so a hit costs one DOM query. */
const seeded = new WeakMap<Translator, Set<string>>();

function markSeeded(translator: Translator, locale: Locale): void {
    let locales = seeded.get(translator);
    if (!locales) {
        locales = new Set();
        seeded.set(translator, locales);
    }
    locales.add(locale);
}

const warned = new Set<string>();

/**
 * Two React roots on one page share the `useId` sequence unless they were given
 * distinct `identifierPrefix` values, so their providers can emit scripts under
 * the same id. There is no way to tell from render which one belongs to the tree
 * currently hydrating, so refuse to guess: seeding is skipped and the catalog
 * loads lazily, exactly as it did before this mechanism existed.
 */
function isAmbiguous(id: string, count: number): boolean {
    if (count <= 1) return false;
    if (!warned.has(id)) {
        warned.add(id);
        console.warn(
            `Found ${count} inlined translation catalogs for id "${id}". ` +
                "Give each React root a distinct `identifierPrefix` so their ids cannot collide. " +
                "Falling back to loading the catalog.",
        );
    }
    return true;
}

/**
 * Seed one provider's translator from the catalog the server inlined for it.
 *
 * Returns the raw payload text when one was applied, so the emitter can render an
 * identical `<script>` back and keep hydration byte-for-byte stable.
 *
 * `useId` is stable across a server render and its hydration, but a provider
 * mounted later by client-side navigation gets a fresh id that could collide with
 * an id from the server tree. The locale keys in the payload guard against that:
 * a mismatch is treated as a miss, never as a match.
 */
export function readPayload(entry: DehydrationEntry, locale: Locale): string | undefined {
    if (typeof document === "undefined") return undefined;
    if (seeded.get(entry.translator)?.has(locale)) return undefined;

    const scripts = document.querySelectorAll(`script[${DEHYDRATION_ATTRIBUTE}="${entry.id}"]`);
    if (isAmbiguous(entry.id, scripts.length)) return undefined;

    const text = scripts[0]?.textContent;
    if (!text) return undefined;

    let payload: DehydratedPayload;
    try {
        payload = JSON.parse(text) as DehydratedPayload;
    } catch {
        return undefined;
    }

    if (payload.l !== locale) return undefined;
    if (payload.k.length !== entry.keys.length || payload.k.some((key, index) => key !== entry.keys[index])) {
        return undefined;
    }

    entry.translator.prime(locale, payload.c);
    markSeeded(entry.translator, locale);
    return text;
}

/**
 * Seed a whole provider chain, outermost first — a child's `getLocale` merges
 * against its parent, so the parent has to be resolved by the time the child is.
 *
 * Called from `useTranslations` before it touches `fetchLocale`, which is what
 * lets the app put its Suspense boundary anywhere: the consumer seeds itself at
 * the exact moment it renders, whether that is with the provider or inside a
 * boundary that hydrates much later.
 */
export function seedFromDocument(entry: DehydrationEntry | undefined, locale: Locale): void {
    if (!entry) return;
    seedFromDocument(entry.parent, locale);
    readPayload(entry, locale);
}
