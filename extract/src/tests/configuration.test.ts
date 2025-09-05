import assert from "node:assert/strict";
import { test } from "node:test";
import { defineConfig } from "../configuration.ts";
import type { ExtractorPlugin } from "../plugin.ts";

const mockPlugin: ExtractorPlugin = { name: "mock", setup() {} };

test("appends plugins when array provided", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts", plugins: [mockPlugin] });
    assert.equal(cfg.plugins.length, 3);
    assert.equal(cfg.plugins.at(-1), mockPlugin);
});

test("allows overriding default plugins with function", () => {
    const cfg = defineConfig({
        entrypoints: "src/index.ts",
        plugins(defaults) {
            return defaults.filter((p) => p.name !== "po");
        },
    });
    assert.deepEqual(
        cfg.plugins.map((p) => p.name),
        ["core"],
    );
});

test("normalizes single entrypoint to array", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts" });
    assert.deepEqual(cfg.entrypoints, ["src/index.ts"]);
});
