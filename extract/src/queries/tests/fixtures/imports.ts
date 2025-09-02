// @ts-nocheck
/** biome-ignore-all lint/correctness/noUnusedVariables: true */
/** biome-ignore-all lint/correctness/noUnusedImports: true */

import defaultExport from "default-export";
import { named } from "named-export";
import * as ns from "namespace-export";
import "side-effect";

export * from "export-all";
export { default as alias } from "export-from";

const cjs = require("cjs-module");
const resolved = require.resolve("resolved-module");
import("dynamic-import");
async function load() {
    await import("async-import");
}
