import { defineConfig } from "bumpp";

export default defineConfig({
    recursive: true,
    execute: "node scripts/post-bump.js",
});
