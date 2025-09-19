import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { Plugin } from "../plugin.ts";
import { run } from "../run.ts";

test("runs all process hooks for a file", async () => {
    const entrypoint = "dummy.tsx";
    const coreTranslations = [{ id: "core", message: [""] }];
    const reactTranslations = [{ id: "react", message: [""] }];
    const collected: unknown[] = [];

    const corePlugin: Plugin = {
        name: "core-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, (args) => args);
            build.onLoad({ filter: /.*/, namespace: "source" }, (args) => ({ ...args, data: "" }));
            build.onProcess({ filter: /.*/, namespace: "source" }, (args) => {
                collected.push(coreTranslations);
                return { ...args, data: coreTranslations };
            });
        },
    };

    const reactPlugin: Plugin = {
        name: "react-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => ({
                entrypoint,
                path,
                namespace,
            }));
            build.onLoad({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => ({
                entrypoint,
                path,
                namespace,
                data: "",
            }));
            build.onProcess({ filter: /.*/, namespace: "source" }, (args) => {
                collected.push(reactTranslations);
                return { ...args, data: reactTranslations };
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [corePlugin, reactPlugin] });
    await run(config.entrypoints[0], { config });

    assert.equal(collected.length, 2);
    assert.deepEqual(collected, [coreTranslations, reactTranslations]);
});

test("skips resolving additional files when walk disabled", async () => {
    const entrypoint = "entry.ts";
    const extra = "extra.ts";
    let resolvedExtra = false;

    const plugin: Plugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => {
                if (path === extra) resolvedExtra = true;
                return { entrypoint, path, namespace };
            });
            build.onLoad({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => ({
                entrypoint,
                path,
                namespace,
                data: "",
            }));
            build.onProcess({ filter: /.*/, namespace: "source" }, (args) => {
                build.resolve({
                    entrypoint: args.entrypoint,
                    path: extra,
                    namespace: "source",
                });
                return undefined;
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, walk: false, plugins: () => [plugin] });
    await run(config.entrypoints[0], { config });

    assert.equal(resolvedExtra, false);
});

test("skips resolving paths matching exclude", async () => {
    const entrypoint = "entry.ts";
    const extra = "extra.ts";
    let resolvedExtra = false;

    const plugin: Plugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => {
                if (path === extra) resolvedExtra = true;
                return { entrypoint, path, namespace };
            });
            build.onLoad({ filter: /.*/, namespace: "source" }, ({ entrypoint, path, namespace }) => ({
                entrypoint,
                path,
                namespace,
                data: "",
            }));
            build.onProcess({ filter: /.*/, namespace: "source" }, (args) => {
                build.resolve({
                    entrypoint: args.entrypoint,
                    path: extra,
                    namespace: "source",
                });
                return undefined;
            });
        },
    };

    const config = defineConfig({
        entrypoints: entrypoint,
        exclude: (p) => p.path === extra,
        plugins: () => [plugin],
    });
    await run(config.entrypoints[0], { config });

    assert.equal(resolvedExtra, false);
});

test("resolves glob entrypoints to matched files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const file = join(directory, "entry.ts");
    await writeFile(file, "export const foo = 'bar';");

    const entrypoint = join(directory, "**/*.ts").replaceAll("\\", "/");
    const seen: string[] = [];

    const plugin: Plugin = {
        name: "glob-entrypoint",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, (args) => {
                seen.push(resolve(args.entrypoint));
                return args;
            });
            build.onLoad({ filter: /.*/, namespace: "source" }, (args) => ({
                ...args,
                data: "",
            }));
            build.onProcess({ filter: /.*/, namespace: "source" }, () => undefined);
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [plugin] });
    await run(config.entrypoints[0], { config });

    assert.deepEqual(seen, [file]);
});
