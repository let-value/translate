import { defineConfig } from "vite-plus";

export default defineConfig({
    run: {
        tasks: {
            // Bun resolves workspace imports through each package's `exports`,
            // so every package the binary pulls in has to be packed first.
            // `from` only covers this package's own dependencies — it does not
            // cascade — so packages the extractor imports at runtime are listed
            // explicitly.
            compile: {
                command: "bun run scripts/compile.ts",
                dependsOn: [{ task: "build", from: ["dependencies", "devDependencies"] }, "@let-value/graph#build"],
                // The target is derived from the host platform/arch/libc, which
                // is not part of the fingerprint: a cache hit across runners
                // would restore a binary for the wrong target.
                cache: false,
            },
        },
    },
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
