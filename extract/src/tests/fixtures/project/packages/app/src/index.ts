import defaultExport from "./default-export";
import { namedExport } from "./named-export.js";
import * as namespaceExport from "./namespace-export";
import "./side-effect.js";
export * from "./export-all";
export { something } from "./export-from";
const cjs = require("./cjs-module.cjs");
require.resolve("./resolved-module");
import("./dynamic-import");
async function load() {
  await import("./async-import");
}
import alias from "@app/alias/alias-module";
import base from "base-module";
import lib from "@lib/resolved-module";
