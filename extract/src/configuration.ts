import { join } from "node:path";
import { globSync } from "glob";
import type { LevelWithSilent } from "pino";
import type { ExtractorPlugin } from "./plugin.ts";
import { core } from "./plugins/core/core.ts";
import { po } from "./plugins/po/po.ts";

export type DestinationFn = (locale: string, entrypoint: string, path: string) => string;

const defaultPlugins = { core, po };
type DefaultPlugins = typeof defaultPlugins;

export interface EntrypointConfig {
    entrypoint: string;
    destination?: DestinationFn;
    obsolete?: "mark" | "remove";
}

export interface UserConfig {
    plugins?: ExtractorPlugin[] | ((defaultPlugins: DefaultPlugins) => ExtractorPlugin[]);
    entrypoints: string | EntrypointConfig | Array<string | EntrypointConfig>;
    defaultLocale?: string;
    locales?: string[];
    destination?: DestinationFn;
    obsolete?: "mark" | "remove";
    walk?: boolean;
    logLevel?: LevelWithSilent;
}

export interface ResolvedEntrypoint extends EntrypointConfig {}

export interface ResolvedConfig {
    plugins: ExtractorPlugin[];
    entrypoints: ResolvedEntrypoint[];
    defaultLocale: string;
    locales: string[];
    destination: DestinationFn;
    obsolete: "mark" | "remove";
    walk: boolean;
    logLevel: LevelWithSilent;
}

const defaultDestination: DestinationFn = (locale, _entrypoint, path) => join(locale, path);

export function defineConfig(config: UserConfig): ResolvedConfig {
    let plugins: ExtractorPlugin[];
    const user = config.plugins;
    if (typeof user === "function") {
        plugins = user(defaultPlugins);
    } else if (Array.isArray(user)) {
        plugins = [...Object.values(defaultPlugins).map((plugin) => plugin()), ...user];
    } else {
        plugins = Object.values(defaultPlugins).map((plugin) => plugin());
    }

    const raw = Array.isArray(config.entrypoints) ? config.entrypoints : [config.entrypoints];
    const entrypoints: ResolvedEntrypoint[] = [];
    for (const ep of raw) {
        if (typeof ep === "string") {
            const paths = globSync(ep, { nodir: true });
            if (paths.length === 0) {
                entrypoints.push({ entrypoint: ep });
            } else {
                for (const path of paths) entrypoints.push({ entrypoint: path });
            }
        } else {
            const { entrypoint, destination, obsolete } = ep;
            const paths = globSync(entrypoint, { nodir: true });
            if (paths.length === 0) {
                entrypoints.push({ entrypoint, destination, obsolete });
            } else {
                for (const path of paths) entrypoints.push({ entrypoint: path, destination, obsolete });
            }
        }
    }

    const defaultLocale = config.defaultLocale ?? "en";
    const locales = config.locales ?? [defaultLocale];
    const destination = config.destination ?? defaultDestination;
    const obsolete = config.obsolete ?? "mark";
    const walk = config.walk ?? true;
    const logLevel = config.logLevel ?? "info";
    return { plugins, entrypoints, defaultLocale, locales, destination, obsolete, walk, logLevel };
}
