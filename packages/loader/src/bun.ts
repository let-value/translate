import { type BunPlugin, file } from "bun";
import * as gettextParser from "gettext-parser";

export default {
    name: "@let-value/translate-loader",
    setup(build) {
        build.onLoad({ filter: /\.po$/ }, async ({ path }) => {
            const raw = await file(path).text();
            const po = gettextParser.po.parse(raw);
            return {
                contents: `export default ${JSON.stringify(po)};`,
                loader: "js",
            };
        });
    },
} satisfies BunPlugin;
