import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vite-plus/test";
import { createConfigExplorer, unwrapConfig } from "../../bin/config-loader.ts";

const configurationUrl = new URL("../configuration.ts", import.meta.url).href;

test("loads TypeScript config files", async () => {
    const root = await mkdtemp(join(tmpdir(), "translate-config-"));
    try {
        await writeFile(
            join(root, "translate.config.ts"),
            `
                import { defineConfig } from ${JSON.stringify(configurationUrl)};

                export default defineConfig({ entrypoints: "src/index.ts" });
            `,
        );

        const result = await createConfigExplorer().search(root);
        const config = unwrapConfig(result?.config);

        assert.ok(config);
        assert.equal(config.entrypoints[0]?.entrypoint, "src/index.ts");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("loads named translateConfig exports", async () => {
    const root = await mkdtemp(join(tmpdir(), "translate-config-"));
    try {
        await writeFile(
            join(root, "translate.config.mjs"),
            `
                import { defineConfig } from ${JSON.stringify(configurationUrl)};

                export const translateConfig = defineConfig({ entrypoints: "app.ts" });
            `,
        );

        const result = await createConfigExplorer().search(root);
        const config = unwrapConfig(result?.config);

        assert.ok(config);
        assert.equal(config.entrypoints[0]?.entrypoint, "app.ts");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("loads TypeScript config files from TypeScript 7 projects", async () => {
    const root = await mkdtemp(join(tmpdir(), "translate-config-"));
    try {
        const typescriptPackage = join(root, "node_modules", "typescript");

        await mkdir(typescriptPackage, { recursive: true });
        await writeFile(
            join(root, "package.json"),
            JSON.stringify({
                type: "module",
                devDependencies: { typescript: "7.0.0" },
            }),
        );
        await writeFile(
            join(typescriptPackage, "package.json"),
            JSON.stringify({
                name: "typescript",
                version: "7.0.0",
                type: "module",
                exports: "./index.js",
            }),
        );
        await writeFile(
            join(typescriptPackage, "index.js"),
            'throw new Error("project TypeScript should not be loaded while reading translate.config.ts");',
        );
        await writeFile(
            join(root, "translate.config.ts"),
            `
                import { defineConfig, type UserConfig } from ${JSON.stringify(configurationUrl)};

                const config = { entrypoints: "src/index.ts" } satisfies UserConfig;

                export default defineConfig(config);
            `,
        );

        const result = await createConfigExplorer().search(root);
        const config = unwrapConfig(result?.config);

        assert.ok(config);
        assert.equal(config.entrypoints[0]?.entrypoint, "src/index.ts");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
