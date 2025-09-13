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
            build.onResolve({ filter: /.*/ }, ({ file }) => file);
            build.onLoad({ filter: /.*/ }, () => "");
            build.onProcess({ filter: /.*/ }, async (_args, api) => {
                await fs.mkdir(dirname(generated), { recursive: true });
                await fs.writeFile(generated, "");
                api.graph.add("translate", generated, "");
                api.emit({ path: generated, namespace: "cleanup" });
            });
        },
    };

    const config = defineConfig({ entrypoints: entrypoint, plugins: () => [plugin, cleanup()] });
    await run(entrypoint, { config });

    const exists = await fs.access(stray).then(() => true).catch(() => false);
    assert.equal(exists, false);

    await fs.rm("translations", { recursive: true, force: true });
});

