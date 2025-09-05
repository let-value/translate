import type { ExtractorPlugin } from "./plugin.ts";
import { core } from "./plugins/core/core.ts";
import { po } from "./plugins/po/po.ts";

export interface UserConfig {
    plugins?: ExtractorPlugin[] | ((plugins: ExtractorPlugin[]) => ExtractorPlugin[]);
    entrypoints: string | string[];
    defaultLocale?: string;
    locales?: string[];
    destination?: (locale: string, entrypoint: string) => string;
    obsolete?: "mark" | "remove";
}

export interface ResolvedConfig {
    plugins: ExtractorPlugin[];
    entrypoints: string[];
    defaultLocale: string;
    locales: string[];
    destination: (locale: string, entrypoint: string) => string;
    obsolete: "mark" | "remove";
}

const defaultPlugins: ExtractorPlugin[] = [core(), po()];
const defaultDestination = (locale: string) => locale;

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
    const defaultLocale = config.defaultLocale ?? "en";
    const locales = config.locales ?? [defaultLocale];
    const destination = config.destination ?? defaultDestination;
    const obsolete = config.obsolete ?? "mark";
    return { plugins, entrypoints, defaultLocale, locales, destination, obsolete };
}
