import type { ExtractorPlugin } from "./plugin.ts";
import { core } from "./plugins/core/core.ts";
import { po } from "./plugins/po/po.ts";

export interface UserConfig {
    plugins?: ExtractorPlugin[] | ((plugins: ExtractorPlugin[]) => ExtractorPlugin[]);
    entrypoints: string | string[];
}

export interface ResolvedConfig {
    plugins: ExtractorPlugin[];
    entrypoints: string[];
}

const defaultPlugins: ExtractorPlugin[] = [core(), po()];

export function defineConfig(config: UserConfig): ResolvedConfig {
    let plugins: ExtractorPlugin[];
    const user = config.plugins;
    if (typeof user === "function") {
        plugins = user(defaultPlugins);
    } else if (Array.isArray(user)) {
        plugins = [...defaultPlugins, ...user];
    } else {
        plugins = defaultPlugins;
    }
    const entrypoints = Array.isArray(config.entrypoints) ? config.entrypoints : [config.entrypoints];
    return { plugins, entrypoints };
}
