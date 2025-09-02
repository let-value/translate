import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { suite, test } from "node:test";

import { parseFile } from "../parse.ts";
import { resolveImport, resolveImports } from "../walk.ts";

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
  "base-module": path.join(appRoot, "base-module.ts"),
  "@lib/resolved-module": path.join(libRoot, "resolved-module/index.ts"),
};

suite("resolveImport - app", () => {
  for (const [spec, expected] of Object.entries(appCases)) {
    test(spec, () => {
      assert.equal(resolveImport(appEntryPath, spec), expected);
    });
  }
});

suite("resolveImports - app", () => {
  test("resolves all imports from app index", () => {
    const { imports } = parseFile(appEntryPath);
    const resolved = resolveImports(appEntryPath, imports).sort();
    const expected = Object.values(appCases).sort();
    assert.deepEqual(resolved, expected);
  });
});

const libCases: Record<string, string> = {
  "@lib/base-module": path.join(libRoot, "base-module.ts"),
  "@app/default-export": path.join(appRoot, "default-export.ts"),
};

suite("resolveImport - lib", () => {
  for (const [spec, expected] of Object.entries(libCases)) {
    test(spec, () => {
      assert.equal(resolveImport(libEntryPath, spec), expected);
    });
  }
});

suite("resolveImports - lib", () => {
  test("resolves all imports from lib index", () => {
    const { imports } = parseFile(libEntryPath);
    const resolved = resolveImports(libEntryPath, imports).sort();
    const expected = Object.values(libCases).sort();
    assert.deepEqual(resolved, expected);
  });
});
