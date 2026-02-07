import { defineConfig } from "tsdown";

import { base } from "../tsdown.config.ts";

export default defineConfig({
    entry: ["src/index.ts", "src/core.ts", "src/static.ts", "bin/cli.ts"],
    ...base,
});
