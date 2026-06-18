import { defineConfig } from "vite-plus";

export default defineConfig({
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
