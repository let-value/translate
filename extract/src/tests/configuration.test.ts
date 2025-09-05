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

test("provides default locale and locales", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts" });
    assert.equal(cfg.defaultLocale, "en");
    assert.deepEqual(cfg.locales, ["en"]);
});

test("resolves locales and default locale", () => {
    const cfg = defineConfig({
        entrypoints: "src/index.ts",
        defaultLocale: "en",
        locales: ["en", "es"],
    });
    assert.equal(cfg.defaultLocale, "en");
    assert.deepEqual(cfg.locales, ["en", "es"]);
});

test("uses custom destination and obsolete strategy", () => {
    const destination = (locale: string, entry: string) => `${locale}/${entry}`;
    const cfg = defineConfig({
        entrypoints: "src/index.ts",
        destination,
        obsolete: "remove",
    });
    assert.equal(cfg.destination, destination);
    assert.equal(cfg.obsolete, "remove");
});
