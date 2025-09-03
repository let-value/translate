import fs from "node:fs";
import path from "node:path";
import type {
    ExtractBuild,
    ExtractorPlugin,
    ExtractArgs,
    LoadArgs,
    ResolveArgs,
} from "./plugin.ts";
import type { GetTextTranslation } from "gettext-parser";
import { parseSource } from "./parse.ts";
import { resolveImport } from "./walk.ts";
import { buildPo, collect, type Message } from "./po.ts";

export interface CorePlugin extends ExtractorPlugin {
    messages: Message[];
    po: string;
}

export function corePlugin(): CorePlugin {
    const plugin: CorePlugin = {
        name: "core",
        messages: [],
        po: "",
        setup(build: ExtractBuild) {
            build.onResolve({ filter: /.*/ }, ({ path: spec, importer }: ResolveArgs) => {
                if (importer) {
                    return resolveImport(importer, spec);
                }
                return path.resolve(spec);
            });

            build.onLoad({ filter: /.*/ }, ({ path }: LoadArgs) => {
                const contents = fs.readFileSync(path, "utf8");
                return { contents };
            });

            build.onExtract(
                { filter: /\.[jt]sx?$/ },
                ({ path, contents }: ExtractArgs) => {
                    const { translations, imports } = parseSource(contents, path);
                    return { messages: translations, imports };
                },
            );

            build.onCollect((messages: GetTextTranslation[]) => {
                plugin.messages = collect(messages);
            });

            build.onGenerate((locale: string, messages: GetTextTranslation[]) => {
                if (!locale) return;
                if (plugin.messages.length === 0) {
                    plugin.messages = collect(messages);
                }
                plugin.po = buildPo(locale, plugin.messages);
            });
        },
    };

    return plugin;
}

export { corePlugin as default };
