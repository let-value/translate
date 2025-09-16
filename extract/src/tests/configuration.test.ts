import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { type DestinationFn, defineConfig } from "../configuration.ts";
import type { Plugin } from "../plugin.ts";

const mockPlugin: Plugin = { name: "mock", setup() {} };

test("appends plugins when array provided", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts", plugins: [mockPlugin] });
    assert.equal(cfg.plugins.length, 3);
    assert.equal(cfg.plugins.at(-1), mockPlugin);
});

test("allows overriding default plugins with function", () => {
    const cfg = defineConfig({
        entrypoints: "src/index.ts",
        plugins({ core }) {
            return [core()];
        },
    });
    assert.deepEqual(
        cfg.plugins.map((p) => p.name),
        ["core"],
    );
});

test("normalizes single entrypoint to array", () => {
    const cfg = defineConfig({ entrypoints: join("src/index.ts") });
    assert.deepEqual(
        cfg.entrypoints.map((e) => e.entrypoint),
        [join("src/index.ts")],
    );
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
    const destination: DestinationFn = ({ locale, entrypoint, path }) => `${locale}/${entrypoint}/${path}`;
    const cfg = defineConfig({
        entrypoints: "src/index.ts",
        destination,
        obsolete: "remove",
    });
    assert.equal(cfg.destination, destination);
    assert.equal(cfg.obsolete, "remove");
});

test("supports object entrypoints with overrides", () => {
    const destination: DestinationFn = ({ locale, path }) => `${locale}/${path}`;
    const cfg = defineConfig({
        entrypoints: [{ entrypoint: "src/index.ts", destination, obsolete: "remove" }],
    });
    assert.equal(cfg.entrypoints[0].destination, destination);
    assert.equal(cfg.entrypoints[0].obsolete, "remove");
});

test("configures walk option", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts" });
    assert.equal(cfg.walk, true);
    const cfg2 = defineConfig({ entrypoints: "src/index.ts", walk: false });
    assert.equal(cfg2.walk, false);
});

test("provides default excludes", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts" });
    for (const p of ["foo/node_modules/bar.ts", "foo/dist/bar.ts", "foo/build/bar.ts"]) {
        assert(cfg.exclude.some((e) => (e instanceof RegExp ? e.test(p) : e(p))));
    }
});

test("supports exclude overrides", () => {
    const cfg = defineConfig({
        entrypoints: [{ entrypoint: "src/index.ts", exclude: /skip/ }],
        exclude: /global/,
    });
    assert(cfg.exclude.some((e) => (e instanceof RegExp ? e.test("global") : e("global"))));
    const epExclude = cfg.entrypoints[0].exclude;
    assert(epExclude);
    assert(epExclude.some((e) => (e instanceof RegExp ? e.test("skip") : e("skip"))));
    assert(!epExclude.some((e) => (e instanceof RegExp ? e.test("global") : e("global"))));
    assert(epExclude.some((e) => (e instanceof RegExp ? e.test("node_modules/foo") : e("node_modules/foo"))));
});

test("defaults log level to info", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts" });
    assert.equal(cfg.logLevel, "info");
});

test("resolves provided log level", () => {
    const cfg = defineConfig({ entrypoints: "src/index.ts", logLevel: "debug" });
    assert.equal(cfg.logLevel, "debug");
});
