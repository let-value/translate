import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtractorPlugin, GenerateArgs } from "../plugin.ts";
import { run } from "../run.ts";
import { defineConfig } from "../configuration.ts";

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
        locale,
        path: destination,
    });
});
