import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    include: ["test/**/*.test.ts"],
                },
            },
            {
                test: {
                    include: ["test/**/*.test.tsx"],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
    },
    pack: {
        entry: "src/index.ts",
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist",
        clean: true,
    },
});
