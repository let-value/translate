import assert from "node:assert/strict";
import { test } from "node:test";
import { merge, formatDate } from "../po.ts";
import type { CollectResult } from "../../../plugin.ts";

test("sets POT-Creation-Date header from context timestamp", () => {
    const timestamp = new Date("2023-01-02T03:04:00Z");
    const collected: CollectResult[] = [
        {
            entrypoint: "entry.ts",
            path: "entry.ts",
            destination: "messages.po",
            translations: { "": {} },
        },
    ];
    const out = merge("en", collected, undefined, "mark", timestamp);
    assert.ok(out.includes(`POT-Creation-Date: ${formatDate(timestamp)}`));
});
