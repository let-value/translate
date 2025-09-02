import defaultExport from "./default-export.ts";
import { namedExport } from "./named-export.js";
import * as namespaceExport from "./namespace-export.ts";
import "./side-effect.js";

export * from "./export-all.ts";
export { something } from "./export-from.ts";

const cjs = require("./cjs-module.cjs");
require.resolve("./resolved-module");
import("./dynamic-import.ts");
async function load() {
    await import("./async-import.ts");
}

import alias from "@app/alias/alias-module";
import lib from "@lib/resolved-module";
import base from "base-module";
