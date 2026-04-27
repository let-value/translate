import type { Locale } from "@let-value/translate";
import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";

type TranslationLoader = () => Promise<GetTextTranslations>;
export type TranslationEntry = GetTextTranslations | TranslationLoader;
export type TranslationsMap = Partial<Record<Locale, TranslationEntry>>;

// Fast path: WeakMap keyed on the translations object reference.
// GC-safe — entries are collected when the object is no longer reachable.
const cacheNoParent = new WeakMap<object, Translator>();
const cacheWithParent = new WeakMap<object, WeakMap<Translator, Translator>>();

function getFromWeakMap(translations: TranslationsMap, parent: Translator | undefined): Translator | undefined {
    if (!parent) return cacheNoParent.get(translations);
    return cacheWithParent.get(translations)?.get(parent);
}

function setInWeakMap(translations: TranslationsMap, parent: Translator | undefined, translator: Translator): void {
    if (!parent) {
        cacheNoParent.set(translations, translator);
        return;
    }
    let byParent = cacheWithParent.get(translations);
    if (!byParent) {
        byParent = new WeakMap();
        cacheWithParent.set(translations, byParent);
    }
    byParent.set(parent, translator);
}

// Slow path: bounded structural cache for dynamically-created translations objects
// (e.g. `translations={{ en: data }}` — new wrapper object, stable value references).
// Bounded to cap memory usage in infinite-render scenarios.
const MAX_STRUCTURAL_ENTRIES = 32;

type SortedEntry = [Locale, TranslationEntry];

interface StructuralEntry {
    sortedEntries: SortedEntry[];
    parent: Translator | undefined;
    translator: Translator;
}

const structuralCache: StructuralEntry[] = [];

function toSortedEntries(translations: TranslationsMap): SortedEntry[] {
    return (Object.entries(translations) as SortedEntry[]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function findStructural(sortedEntries: SortedEntry[], parent: Translator | undefined): Translator | undefined {
    for (const entry of structuralCache) {
        if (entry.parent !== parent || entry.sortedEntries.length !== sortedEntries.length) continue;
        if (entry.sortedEntries.every(([k, v], i) => sortedEntries[i][0] === k && sortedEntries[i][1] === v)) {
            return entry.translator;
        }
    }
    return undefined;
}

export function getCachedTranslator(translations: TranslationsMap, parent: Translator | undefined): Translator {
    // Fast path: same object reference
    const cached = getFromWeakMap(translations, parent);
    if (cached) return cached;

    // Slow path: same locale keys and value references, different wrapper object
    const sortedEntries = toSortedEntries(translations);
    const structural = findStructural(sortedEntries, parent);
    if (structural) {
        // Backfill WeakMap so subsequent renders with the same new-object are O(1)
        setInWeakMap(translations, parent, structural);
        return structural;
    }

    const translator = new Translator(translations, parent);
    setInWeakMap(translations, parent, translator);
    structuralCache.unshift({ sortedEntries, parent, translator });
    if (structuralCache.length > MAX_STRUCTURAL_ENTRIES) structuralCache.pop();
    return translator;
}

/** Exported only for tests — do not use in application code. */
export const _structuralCacheSize = (): number => structuralCache.length;
