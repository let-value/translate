import { defineConfig } from "tsdown";
import { base } from "../tsdown.config.ts";

export default defineConfig({
    entry: ["src/index.ts", "bin/cli.ts", "bin/launcher.ts", "scripts/postinstall.ts"],
    noExternal: ["@let-value/translate-extract"],
    ...base,
});
