import { defineConfig } from "tsdown";
import { base } from "../tsdown.config.ts";

export default defineConfig({
    entry: ["src/index.ts", "bin/cli.ts", "scripts/postinstall.ts"],
    external: [/\.node$/],
    ...base,
});
