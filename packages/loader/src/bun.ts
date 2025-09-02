import { readFile } from "node:fs/promises";
import * as gettextParser from "gettext-parser";

export default {
    name: "@let-value/translate-loader",
    setup(build: any) {
        build.onLoad({ filter: /\.po$/ }, async (args: any) => {
            const raw = await readFile(args.path);
            const po = gettextParser.po.parse(raw);
            return {
                contents: `export default ${JSON.stringify(po)};`,
                loader: "js",
            };
        });
    },
};
