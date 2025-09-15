import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { defineConfig } from "../../../configuration.ts";
import type { Plugin } from "../../../plugin.ts";
import { run } from "../../../run.ts";
import { cleanup } from "../cleanup.ts";

test("removes empty stray translation files", async () => {
    const entrypoint = "dummy.ts";
    const generated = join("translations", "dummy.en.po");
    const stray = join("translations", "stray.en.po");

    await fs.mkdir("translations", { recursive: true });
    await fs.writeFile(stray, "");

    const plugin: Plugin = {
        name: "mock",
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
            build.onProcess({ filter: /.*/, namespace: "source" }, async (args) => {
                await fs.mkdir(dirname(generated), { recursive: true });
                await fs.writeFile(generated, "");
                build.resolve({
                    entrypoint: args.entrypoint,
                    path: generated,
                    namespace: "translate",
                });
                build.resolve({
                    entrypoint: args.entrypoint,
                    path: generated,
                    namespace: "cleanup",
                });
                return undefined;
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [plugin, cleanup()] });
    await run(config.entrypoints[0], { config });

    const exists = await fs.access(stray).then(() => true).catch(() => false);
    assert.equal(exists, false);

    await fs.rm("translations", { recursive: true, force: true });
});

