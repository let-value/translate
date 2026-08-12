import assert from "node:assert/strict";
import { describe, test } from "vite-plus/test";

import type { Translation } from "../../core/queries/types.ts";
import { collect } from "../collect.ts";
import { merge } from "../merge.ts";
import { sortReferences } from "../references.ts";

describe("sortReferences", () => {
    test("orders by path, then line, then column", () => {
        const sorted = sortReferences(["app/b.ts:2", "app/a.ts:10", "app/a.ts:2:9", "app/a.ts:2:1", "app/a.ts:1"]);

        assert.deepEqual(sorted, ["app/a.ts:1", "app/a.ts:2:1", "app/a.ts:2:9", "app/a.ts:10", "app/b.ts:2"]);
    });

    test("keeps references without a line number", () => {
        assert.deepEqual(sortReferences(["b.ts", "a.ts:1", "a.ts"]), ["a.ts", "a.ts:1", "b.ts"]);
    });

    test("does not treat a Windows drive letter as a line number", () => {
        assert.deepEqual(sortReferences(["C:/app/b.ts:1", "C:/app/a.ts:2"]), ["C:/app/a.ts:2", "C:/app/b.ts:1"]);
    });
});

describe("reference order", () => {
    const references = ["app/z.ts:2", "app/a.ts:20", "app/a.ts:3", "app/m.ts:1"];
    const expected = ["app/a.ts:3", "app/a.ts:20", "app/m.ts:1", "app/z.ts:2"];

    function build(order: string[]) {
        return order.map<Translation>((reference) => ({
            id: "Linking",
            message: ["Linking"],
            comments: { reference },
        }));
    }

    test("is independent of discovery order within an entrypoint", () => {
        for (const order of [references, [...references].reverse()]) {
            const record = collect(build(order), "en");
            assert.deepEqual(record[""].Linking.comments?.reference?.split("\n"), expected);
        }
    });

    test("is independent of the order entrypoints are merged in", () => {
        const sources = references.map((reference) => ({ translations: collect(build([reference]), "en") }));

        for (const order of [sources, [...sources].reverse()]) {
            const merged = merge(order, undefined, "mark", "en", new Date());
            assert.deepEqual(merged.translations[""].Linking.comments?.reference?.split("\n"), expected);
        }
    });
});

describe("message order", () => {
    function build(ids: string[]) {
        return ids.map<Translation>((id) => ({ id, message: [id], comments: { reference: `app/${id}.ts:1` } }));
    }

    test("new messages are appended in canonical order", () => {
        const ids = ["Zebra", "Apple", "Mango"];

        for (const order of [ids, [...ids].reverse()]) {
            const merged = merge([{ translations: collect(build(order), "en") }], undefined, "mark", "en", new Date());
            assert.deepEqual(
                Object.keys(merged.translations[""]).filter((id) => id !== ""),
                ["Apple", "Mango", "Zebra"],
            );
        }
    });

    test("messages already in the catalog keep their position", () => {
        const first = merge(
            [{ translations: collect(build(["Zebra", "Apple"]), "en") }],
            undefined,
            "mark",
            "en",
            new Date(),
        );
        const second = merge(
            [{ translations: collect(build(["Zebra", "Apple", "Mango"]), "en") }],
            first,
            "mark",
            "en",
            new Date(),
        );

        assert.deepEqual(
            Object.keys(second.translations[""]).filter((id) => id !== ""),
            ["Apple", "Zebra", "Mango"],
        );
    });
});
