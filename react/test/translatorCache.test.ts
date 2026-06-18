import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { _structuralCacheSize, getCachedTranslator } from "../src/translatorCache.ts";

// Each factory call produces a fresh object so tests don't share structural cache entries.
const makeTranslations = (): GetTextTranslations => ({ charset: "utf-8", headers: {}, translations: { "": {} } });

test("stable reference: same object returns same Translator", () => {
    const data = makeTranslations();
    const props = { en: data };
    assert.strictEqual(getCachedTranslator(props, undefined), getCachedTranslator(props, undefined));
});

test("dynamic object: new wrapper with same value references returns same Translator", () => {
    const data = makeTranslations();
    // Simulate inline `translations={{ en: data }}` — new outer object each call, stable value
    const t1 = getCachedTranslator({ en: data }, undefined);
    const t2 = getCachedTranslator({ en: data }, undefined);
    assert.strictEqual(t1, t2);
});

test("dynamic object: new wrapper with same values, WeakMap is backfilled after first structural hit", () => {
    const data = makeTranslations();
    const obj1 = { en: data };
    const obj2 = { en: data };
    const t1 = getCachedTranslator(obj1, undefined); // structural miss → new Translator
    const t2 = getCachedTranslator(obj2, undefined); // structural hit → same Translator, obj2 backfilled
    const t3 = getCachedTranslator(obj2, undefined); // WeakMap hit (backfilled)
    assert.strictEqual(t1, t2);
    assert.strictEqual(t2, t3);
});

test("different locale keys produce different Translators", () => {
    const data = makeTranslations();
    const t1 = getCachedTranslator({ en: data }, undefined);
    const t2 = getCachedTranslator({ fr: data }, undefined);
    assert.notStrictEqual(t1, t2);
});

test("different locale values produce different Translators", () => {
    const a = makeTranslations();
    const b = makeTranslations(); // distinct reference → distinct content identity
    const t1 = getCachedTranslator({ en: a }, undefined);
    const t2 = getCachedTranslator({ en: b }, undefined);
    assert.notStrictEqual(t1, t2);
});

test("same content but different parents produce different Translators", () => {
    const data = makeTranslations();
    const parent1 = new Translator({});
    const parent2 = new Translator({});
    const t1 = getCachedTranslator({ en: data }, parent1);
    const t2 = getCachedTranslator({ en: data }, parent2);
    assert.notStrictEqual(t1, t2);
});

test("same content and same parent returns same Translator (with parent)", () => {
    const data = makeTranslations();
    const parent = new Translator({});
    const t1 = getCachedTranslator({ en: data }, parent);
    const t2 = getCachedTranslator({ en: data }, parent);
    assert.strictEqual(t1, t2);
});

test("structural cache is bounded: high-churn scenario does not grow cache unboundedly", () => {
    const data = makeTranslations();
    const MAX = 32;

    // Drive the cache past its capacity with unique locale keys so every entry is a miss.
    for (let i = 0; i < MAX + 20; i++) {
        getCachedTranslator({ [`churn${i}`]: data } as never, undefined);
    }

    assert.ok(_structuralCacheSize() <= MAX, `structural cache exceeded max: ${_structuralCacheSize()}`);
});

test("structural cache still works after eviction", () => {
    const data = makeTranslations();
    const MAX = 32;

    // Fill the cache with unique entries to force eviction of the initial entry.
    const t1 = getCachedTranslator({ evict_check: data } as never, undefined);
    for (let i = 0; i < MAX; i++) {
        getCachedTranslator({ [`fill${i}`]: data } as never, undefined);
    }
    // t1's structural entry has been evicted; a new object with same content creates a new Translator.
    const t2 = getCachedTranslator({ evict_check: data } as never, undefined);
    // The two Translators are functionally equivalent but are different instances after eviction.
    assert.notStrictEqual(t1, t2);
    assert.ok(_structuralCacheSize() <= MAX);
});
