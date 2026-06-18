import { defineConfig } from "vite-plus";

export default defineConfig({
    test: {
        testTimeout: 30_000,
    },
    pack: {
        entry: ["src/index.ts", "src/core.ts", "src/static.ts", "bin/cli.ts"],
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist",
        clean: true,
    },
});
