import { defineConfig } from "@let-value/translate-extract-static";

export default defineConfig({
    entrypoints: "index.ts",
    locales: ["en", "fr"],
    walk: false,
});
