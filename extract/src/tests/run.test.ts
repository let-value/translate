import assert from "node:assert/strict";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { ExtractorPlugin, GenerateArgs } from "../plugin.ts";
import { run } from "../run.ts";

test("passes collected messages to generate hooks", async () => {
    const entrypoint = "dummy.ts";
    const path = entrypoint;
    const destination = "messages.po";
    const locale = "en";
    const translations = [{ msgid: "hello", msgstr: [""] }];

    let generated: GenerateArgs | undefined;

    const plugin: ExtractorPlugin = {
        name: "mock",
        setup(build) {
            build.onResolve({ filter: /.*/ }, () => ({ entrypoint, path }));
            build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: "" }));
            build.onExtract({ filter: /.*/ }, (args) => ({ ...args, translations }));
            build.onCollect({ filter: /.*/ }, (args) => ({ ...args, destination }));
            build.onGenerate({ filter: /.*/ }, (args) => {
                generated = args;
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint });
    await run(entrypoint, [plugin], "en", { dest: "", config });

    const finalPath = `${locale}/${destination}`;
    assert.deepEqual(generated, {
        collected: [
            {
                destination: finalPath,
                entrypoint,
                path,
                translations,
            },
        ],
        entrypoint,
        locale,
        path: finalPath,
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

    const config = defineConfig({ entrypoints: entrypoint, walk: false });
    await run(entrypoint, [plugin], "en", { dest: "", config });

    assert.equal(resolvedExtra, false);
});
