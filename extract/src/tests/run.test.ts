import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { ExtractorPlugin, GenerateArgs } from "../plugin.ts";
import { run } from "../run.ts";

test("passes collected messages to generate hooks", async () => {
    const entrypoint = "dummy.ts";
    const path = entrypoint;
    const locale = "en";
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
    await run(entrypoint, { locale, config });

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
    await run(entrypoint, { locale: "en", config });

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
    await run(entrypoint, { locale: "en", config });

    assert.equal(resolvedExtra, false);
});
