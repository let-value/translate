import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { ExtractorPlugin, GenerateArgs } from "../plugin.ts";
import { run } from "../run.ts";

test("passes collected messages to generate hooks", async () => {
    const entrypoint = "dummy.ts";
    const path = entrypoint;
    const destination = join("translations", "dummy.en.po");
    const translations = [{ id: "hello", message: [""] }];

    let generated: GenerateArgs | undefined;

    const plugin: ExtractorPlugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, () => ({ entrypoint, path }));
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => ({ ...args, translations }));
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args }));
            build.onGenerate({ filter: /.*/ }, (args) => {
                generated = args;
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [plugin] });
    await run(entrypoint, { config });

    assert.deepEqual(generated, {
        collected: [
            {
                destination,
                entrypoint,
                path,
                translations,
            },
        ],
        entrypoint,
        path: destination,
    });
});

test("runs all extract hooks for a file", async () => {
    const entrypoint = "dummy.tsx";
    const path = entrypoint;
    const coreTranslations = [{ id: "core", message: [""] }];
    const reactTranslations = [{ id: "react", message: [""] }];

    const corePlugin: ExtractorPlugin = {
        name: "core-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/ }, () => ({ entrypoint, path }));
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => ({ ...args, translations: coreTranslations }));
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args }));
        },
    };

    const reactPlugin: ExtractorPlugin = {
        name: "react-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/ }, () => ({ entrypoint, path }));
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => ({ ...args, translations: reactTranslations }));
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args }));
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [corePlugin, reactPlugin] });
    const results = await run(entrypoint, { config });

    assert.equal(results.length, 2);
    assert.deepEqual(
        results.map((r) => r.translations),
        [coreTranslations, reactTranslations],
    );
});

test("skips resolving additional files when walk disabled", async () => {
    const entrypoint = "entry.ts";
    const extra = "extra.ts";
    let resolvedExtra = false;

    const plugin: ExtractorPlugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path }) => {
                if (path === extra) {
                    resolvedExtra = true;
                }
                return { entrypoint, path };
            });
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => {
                build.resolvePath({ entrypoint, path: extra });
                return { ...args, translations: [] };
            });
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args, destination: "out.po" }));
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, walk: false, plugins: () => [plugin] });
    await run(entrypoint, { config });

    assert.equal(resolvedExtra, false);
});

test("skips resolving paths matching exclude", async () => {
    const entrypoint = "entry.ts";
    const extra = "extra.ts";
    let resolvedExtra = false;

    const plugin: ExtractorPlugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path }) => {
                if (path === extra) {
                    resolvedExtra = true;
                }
                return { entrypoint, path };
            });
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => {
                build.resolvePath({ entrypoint, path: extra });
                return { ...args, translations: [] };
            });
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args, destination: "out.po" }));
        },
    };

    const config = defineConfig({
        entrypoints: entrypoint,
        exclude: (p) => p === extra,
        plugins: () => [plugin],
    });
    await run(entrypoint, { config });

    assert.equal(resolvedExtra, false);
});

test("generates outputs for all configured locales with single extraction", async () => {
    const entrypoint = "dummy.ts";
    const path = entrypoint;
    const translations = [{ id: "hello", message: [""] }];

    let extractCount = 0;
    const generatedLocales: string[] = [];

    const plugin: ExtractorPlugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, () => ({ entrypoint, path }));
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => {
                extractCount++;
                return { ...args, translations };
            });
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args }));
            build.onGenerate({ filter: /.*/ }, (_args, ctx) => {
                generatedLocales.push(ctx.locale);
            });
        },
    };

    const config = defineConfig({
        entrypoints: entrypoint,
        locales: ["en", "es"],
        defaultLocale: "en",
        plugins: () => [plugin],
    });
    await run(entrypoint, { config });

    assert.equal(extractCount, 1);
    assert.deepEqual(generatedLocales.sort(), ["en", "es"]);
});
