import { readFileSync } from "node:fs";
import * as gettextParser from "gettext-parser";
import { createUnplugin } from "unplugin";

export const unplugin = createUnplugin(() => ({
    name: "@let-value/translate-loader",
    resolveId(id) {
        if (id.endsWith(".po")) {
            return id;
        }
        return null;
    },
    load(id) {
        if (!id.endsWith(".po")) {
            return null;
        }
        const raw = readFileSync(id);
        const po = gettextParser.po.parse(raw);
        return `export default ${JSON.stringify(po)};`;
    },
}));

export const { rollup, vite, webpack, esbuild, rspack } = unplugin;
export default unplugin;
