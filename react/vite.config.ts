import { defineConfig } from "vite-plus";
import { reactProjects } from "./vite.projects.ts";

export default defineConfig({
    test: {
        projects: reactProjects(import.meta.dirname),
    },
    pack: {
        entry: "src/index.ts",
        format: ["esm", "cjs"],
        dts: true,
        outDir: "dist",
        clean: true,
    },
});
