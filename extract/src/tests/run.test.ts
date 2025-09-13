import assert from "node:assert/strict";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { Plugin } from "../plugin.ts";
import { run } from "../run.ts";

test("runs all process hooks for a file", async () => {
    const entrypoint = "dummy.tsx";
    const coreTranslations = [{ id: "core", message: [""] }];
    const reactTranslations = [{ id: "react", message: [""] }];

    const corePlugin: Plugin = {
        name: "core-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ file }) => file.path);
            build.onLoad({ filter: /.*/ }, () => "");
            build.onProcess({ filter: /.*/ }, () => coreTranslations);
        },
    };

    const reactPlugin: Plugin = {
        name: "react-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ file }) => file.path);
            build.onLoad({ filter: /.*/ }, () => "");
            build.onProcess({ filter: /.*/ }, () => reactTranslations);
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [corePlugin, reactPlugin] });
    const graph = await run(entrypoint, { config });

    const results = graph.get("source", entrypoint)!;
    assert.equal(results.length, 2);
    assert.deepEqual(results, [coreTranslations, reactTranslations]);
});

test("skips resolving additional files when walk disabled", async () => {
    const entrypoint = "entry.ts";
    const extra = "extra.ts";
    let resolvedExtra = false;

    const plugin: Plugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ file }) => {
                if (file.path === extra) resolvedExtra = true;
                return file.path;
            });
            build.onLoad({ filter: /.*/ }, () => "");
            build.onProcess({ filter: /.*/ }, (_args, api) => {
                api.emit({ path: extra, namespace: "source" });
            });
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

    const plugin: Plugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ file }) => {
                if (file.path === extra) resolvedExtra = true;
                return file.path;
            });
            build.onLoad({ filter: /.*/ }, () => "");
            build.onProcess({ filter: /.*/ }, (_args, api) => {
                api.emit({ path: extra, namespace: "source" });
            });
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
