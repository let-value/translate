import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { defineConfig } from "../configuration.ts";
import type { Plugin, ResolveArgs } from "../plugin.ts";
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

test("does not walk into files that are configured as entrypoints", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const pageA = join(directory, "page-a.ts");
    const pageB = join(directory, "page-b.ts");
    const component = join(directory, "component.ts");

    await writeFile(
        pageA,
        `import "./component";
export const a = 1;
`,
    );
    await writeFile(
        pageB,
        `import "./component";
export const b = 1;
`,
    );
    await writeFile(
        component,
        `export const component = "shared";
`,
    );

    const seenSourcePaths: string[] = [];

    const plugin: Plugin = {
        name: "source-spy",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, (args) => {
                seenSourcePaths.push(resolve(args.path));
                return args;
            });
        },
    };

    const config = defineConfig({
        entrypoints: [pageA, pageB, component],
        plugins: ({ core }) => [core(), plugin],
    });

    await run(config.entrypoints[0], { config });

    assert.deepEqual(seenSourcePaths, [resolve(pageA), resolve(component)]);
});

test("promotes files with magic comment to entrypoints and skips duplicate walks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const pageA = join(directory, "page-a.ts");
    const pageB = join(directory, "page-b.ts");
    const component = join(directory, "component.ts");

    await writeFile(
        pageA,
        `import "./component";
message("page-a");
export const a = 1;
`,
    );
    await writeFile(
        pageB,
        `import "./component";
message("page-b");
export const b = 1;
`,
    );
    await writeFile(
        component,
        `// translate-entrypoint
message("component");
export const component = "shared";
`,
    );

    const seenResolves: ResolveArgs[] = [];
    const seenSourcePaths: string[] = [];

    const plugin: Plugin = {
        name: "source-spy",
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: "source" }, (args) => {
                seenResolves.push(args);
                seenSourcePaths.push(resolve(args.path));
                return args;
            });
        },
    };

    const config = defineConfig({
        entrypoints: [pageA, pageB],
        plugins: [plugin],
    });

    await run(config.entrypoints[0], { config });
    await run(config.entrypoints[1], { config });

    assert.deepEqual(seenSourcePaths, [
        resolve(pageA),
        resolve(component),
        resolve(component),
        resolve(pageB),
        resolve(component),
        resolve(component),
    ]);
});

test("keeps promoted entrypoint messages out of original entrypoints when runs overlap", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const pageA = join(directory, "page-a.ts");
    const pageB = join(directory, "page-b.ts");
    const component = join(directory, "component.ts");

    await writeFile(
        pageA,
        `import "./component";
message("page-a");
`,
    );
    await writeFile(
        pageB,
        `import "./component";
message("page-b");
`,
    );
    await writeFile(
        component,
        `// translate-entrypoint
message("component");
`,
    );

    const config = defineConfig({ entrypoints: [pageA, pageB] });

    await Promise.all(config.entrypoints.map((entrypoint) => run(entrypoint, { config })));

    const pageAPo = await readFile(join(directory, "translations", "page-a.en.po"), "utf8");
    const pageBPo = await readFile(join(directory, "translations", "page-b.en.po"), "utf8");
    const componentPo = await readFile(join(directory, "translations", "component.en.po"), "utf8");

    assert.equal(pageAPo.includes('msgid "page-a"'), true);
    assert.equal(pageAPo.includes('msgid "component"'), false);

    assert.equal(pageBPo.includes('msgid "page-b"'), true);
    assert.equal(pageBPo.includes('msgid "component"'), false);

    assert.equal(componentPo.includes('msgid "component"'), true);
    assert.equal(componentPo.includes('msgid "page-a"'), false);
    assert.equal(componentPo.includes('msgid "page-b"'), false);
});

test("does not leak promoted entrypoint messages when entrypoints come from a relative glob", async () => {
    const directory = await mkdtemp(join(tmpdir(), "translate-extract-"));
    const pageA = join(directory, "page-a.ts");
    const pageB = join(directory, "page-b.ts");
    const component = join(directory, "component.ts");

    await writeFile(
        pageA,
        `import "./component";
message("page-a");
`,
    );
    await writeFile(
        pageB,
        `import "./component";
message("page-b");
`,
    );
    await writeFile(
        component,
        `// translate-entrypoint
message("component");
`,
    );

    const previousCwd = process.cwd();
    process.chdir(directory);

    try {
        const config = defineConfig({ entrypoints: "./*.ts" });
        await run(config.entrypoints[0], { config });
    } finally {
        process.chdir(previousCwd);
    }

    const pageAPo = await readFile(join(directory, "translations", "page-a.en.po"), "utf8");
    const pageBPo = await readFile(join(directory, "translations", "page-b.en.po"), "utf8");
    const componentPo = await readFile(join(directory, "translations", "component.en.po"), "utf8");

    assert.equal(pageAPo.includes('msgid "page-a"'), true);
    assert.equal(pageAPo.includes('msgid "component"'), false);

    assert.equal(pageBPo.includes('msgid "page-b"'), true);
    assert.equal(pageBPo.includes('msgid "component"'), false);

    assert.equal(componentPo.includes('msgid "component"'), true);
    assert.equal(componentPo.includes('msgid "page-a"'), false);
    assert.equal(componentPo.includes('msgid "page-b"'), false);
});
