import { join } from "node:path";
import { defineConfig } from "vite-plus";
import { reactProjects } from "./react/vite.projects.ts";

export default defineConfig({
    // Without this the root run globs every test file itself and ignores the
    // packages' own configs, so tests that need a browser (react) or a longer
    // timeout (extract, e2e) fail or flake when run from here rather than from
    // the package directory. React is spread in rather than referenced by
    // directory because Vitest does not descend into a referenced project's own
    // `projects` list.
    test: {
        projects: [
            "graph",
            "loader",
            "translate",
            "extract",
            "extract-static",
            "e2e",
            ...reactProjects(join(import.meta.dirname, "react")),
        ],
    },
    fmt: {
        useTabs: false,
        tabWidth: 4,
        printWidth: 120,
    },
    lint: {
        jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
        plugins: ["import", "react"],
        rules: {
            "react/react-compiler": "error",
            "vite-plus/prefer-vite-plus-imports": "error",
            "no-template-curly-in-string": "off",
            "import/extensions": "error",
        },
        options: { typeAware: true, typeCheck: true },
        ignorePatterns: ["**/fixtures/**/*"],
    },
});
