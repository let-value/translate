import { defineConfig } from "vite-plus";

export default defineConfig({
    pack: {
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
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist",
        clean: true,
    },
});
