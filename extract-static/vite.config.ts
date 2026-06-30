import { defineConfig } from "vite-plus";

export default defineConfig({
    pack: {
        entry: ["src/index.ts", "bin/cli.ts", "scripts/postinstall.ts"],
        deps: {
            neverBundle: [/\.node$/],
            dts: {
                neverBundle: ["@keqingmoe/tree-sitter"],
            },
        },
        format: ["esm", "cjs"],
        outDir: "dist",
        clean: true,
        dts: true,
    },
});
