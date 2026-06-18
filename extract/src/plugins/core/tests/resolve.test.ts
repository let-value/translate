import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "vite-plus/test";
import { fileURLToPath } from "node:url";

import { parseFile } from "../parse.ts";
import { resolveImport, resolveImportResults, resolveImports } from "../resolve.ts";

const appEntryUrl = new URL("./fixtures/project/packages/app/src/index.ts", import.meta.url);
const appEntryPath = fileURLToPath(appEntryUrl);
const appRoot = path.dirname(appEntryPath);

const libEntryUrl = new URL("./fixtures/project/packages/lib/src/index.ts", import.meta.url);
const libEntryPath = fileURLToPath(libEntryUrl);
const libRoot = path.dirname(libEntryPath);

const appCases: Record<string, string> = {
    "./default-export": path.join(appRoot, "default-export.ts"),
    "./named-export.js": path.join(appRoot, "named-export.js"),
    "./namespace-export": path.join(appRoot, "namespace-export.ts"),
    "./side-effect.js": path.join(appRoot, "side-effect.js"),
    "./export-all": path.join(appRoot, "export-all.ts"),
    "./export-from": path.join(appRoot, "export-from.ts"),
    "./cjs-module.cjs": path.join(appRoot, "cjs-module.cjs"),
    "./resolved-module": path.join(appRoot, "resolved-module/index.ts"),
    "./dynamic-import": path.join(appRoot, "dynamic-import.ts"),
    "./async-import": path.join(appRoot, "async-import.ts"),
    "@app/alias/alias-module": path.join(appRoot, "alias/alias-module.ts"),
    "#/alias/alias-module": path.join(appRoot, "alias/alias-module.ts"),
    "base-module": path.join(appRoot, "base-module.ts"),
    "@lib/resolved-module": path.join(libRoot, "resolved-module/index.ts"),
};

describe("resolveImport - app", () => {
    for (const [spec, expected] of Object.entries(appCases)) {
        test(spec, () => {
            assert.equal(resolveImport(appEntryPath, spec), expected);
        });
    }
});

describe("resolveImports - app", () => {
    test("resolves all imports from app index", () => {
        const { imports } = parseFile(appEntryPath);
        const resolved = resolveImports(appEntryPath, imports).sort();
        const expected = Object.values(appCases).sort();
        assert.deepEqual(resolved, expected);
    });

    test("reports unresolved imports", () => {
        const result = resolveImportResults(appEntryPath, ["#/missing"]);

        assert.deepEqual(result.resolved, []);
        assert.equal(result.unresolved.length, 1);
        assert.equal(result.unresolved[0]?.spec, "#/missing");
        assert.match(result.unresolved[0]?.error ?? "", /Can't resolve|Cannot find module|not found/i);
    });

    test("ignores Node builtins", () => {
        assert.equal(resolveImport(appEntryPath, "node:path/posix"), undefined);
        assert.deepEqual(resolveImportResults(appEntryPath, ["node:path", "fs"]).unresolved, []);
    });
});

const libCases: Record<string, string> = {
    "@lib/base-module": path.join(libRoot, "base-module.ts"),
    "@app/default-export": path.join(appRoot, "default-export.ts"),
};

describe("resolveImport - lib", () => {
    for (const [spec, expected] of Object.entries(libCases)) {
        test(spec, () => {
            assert.equal(resolveImport(libEntryPath, spec), expected);
        });
    }
});

describe("resolveImports - lib", () => {
    test("resolves all imports from lib index", () => {
        const { imports } = parseFile(libEntryPath);
        const resolved = resolveImports(libEntryPath, imports).sort();
        const expected = Object.values(libCases).sort();
        assert.deepEqual(resolved, expected);
    });
});
