import { defineConfig } from "tsdown";

import { base } from "../tsdown.config.ts";

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/rollup.ts",
        "src/vite.ts",
        "src/webpack.ts",
        "src/esbuild.ts",
        "src/rspack.ts",
        "src/bun.ts",
    ],
    external: ["bun"],
    ...base,
});
