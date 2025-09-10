import { spawn } from "node:child_process";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("cli loads config and runs extraction", async () => {
    const dir = await mkdtemp(join(tmpdir(), "translate-extract-cli-"));
    const pkgRoot = join(__dirname, "..", "..");
    const source = pathToFileURL(join(pkgRoot, "src/index.ts")).href;
    const cli = join(pkgRoot, "bin/cli.ts");
    const config = `import { defineConfig, type ExtractorPlugin } from '${source}';
import fs from 'node:fs/promises';
import { dirname } from 'node:path';

const plugin: ExtractorPlugin = {
    name: 'test',
    setup(build) {
        build.onResolve({ filter: /.*/ }, ({ entrypoint, path }) => ({ entrypoint, path }));
        build.onLoad({ filter: /.*/ }, (args) => ({ ...args, contents: '' }));
        build.onExtract({ filter: /.*/ }, (args) => ({ ...args, translations: [] }));
        build.onCollect({ filter: /.*/ }, (args) => ({ ...args, destination: 'out.po' }));
        build.onGenerate({ filter: /.*/ }, async ({ path }) => {
            await fs.mkdir(dirname(path), { recursive: true });
            await fs.writeFile(path, 'ok');
        });
    },
};

export default defineConfig({
    entrypoints: 'entry.ts',
    plugins: () => [plugin],
    destination: (_l, _e, p) => p,
    locales: ['en'],
});`;
    await writeFile(join(dir, "translate.config.ts"), config);

    await new Promise<void>((resolve, reject) => {
        const proc = spawn("node", [cli], { cwd: dir, stdio: "inherit" });
        proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(String(code)))));
        proc.on("error", reject);
    });

    await access(join(dir, "out.po"));
});
