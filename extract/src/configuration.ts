import { basename, dirname, extname, join } from "node:path";
import type { LevelWithSilent } from "pino";

import type { Plugin } from "./plugin.ts";
import { core } from "./plugins/core/core.ts";
import { po } from "./plugins/po/po.ts";

export type DestinationFn = (args: { locale: string; entrypoint: string; path: string }) => string;
export type ExcludeFn = (path: string) => boolean;
export type Exclude = RegExp | ExcludeFn;

const defaultPlugins = { core, po };
type DefaultPlugins = typeof defaultPlugins;

export type ObsoleteStrategy = "mark" | "remove";

export interface EntrypointConfig {
    entrypoint: string;
    destination?: DestinationFn;
    obsolete?: ObsoleteStrategy;
    exclude?: Exclude | Exclude[];
}

export interface UserConfig {
    plugins?: Plugin[] | ((defaultPlugins: DefaultPlugins) => Plugin[]);
    entrypoints: string | EntrypointConfig | Array<string | EntrypointConfig>;
    defaultLocale?: string;
    locales?: string[];
    destination?: DestinationFn;
    obsolete?: ObsoleteStrategy;
    walk?: boolean;
    logLevel?: LevelWithSilent;
    exclude?: Exclude | Exclude[];
}

export interface ResolvedEntrypoint extends Omit<EntrypointConfig, "exclude"> {
    exclude?: Exclude[];
}

export interface ResolvedConfig {
    plugins: Plugin[];
    entrypoints: ResolvedEntrypoint[];
    defaultLocale: string;
    locales: string[];
    destination: DestinationFn;
    obsolete: ObsoleteStrategy;
    walk: boolean;
    logLevel: LevelWithSilent;
    exclude: Exclude[];
}

const defaultDestination: DestinationFn = ({ entrypoint, locale }) =>
    join(dirname(entrypoint), "translations", `${basename(entrypoint, extname(entrypoint))}.${locale}.po`);

const defaultExclude: Exclude[] = [
    /(?:^|[\\/])node_modules(?:[\\/]|$)/,
    /(?:^|[\\/])dist(?:[\\/]|$)/,
    /(?:^|[\\/])build(?:[\\/]|$)/,
];

function normalizeExclude(exclude?: Exclude | Exclude[]): Exclude[] {
    if (!exclude) return [];
    return Array.isArray(exclude) ? exclude : [exclude];
}

export function defineConfig(config: UserConfig): ResolvedConfig {
    let plugins: Plugin[];
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
            entrypoints.push({ entrypoint: ep });
        } else {
            const { entrypoint, destination, obsolete, exclude } = ep;
            const epExclude = exclude ? [...defaultExclude, ...normalizeExclude(exclude)] : undefined;
            entrypoints.push({ entrypoint, destination, obsolete, exclude: epExclude });
        }
    }

    const defaultLocale = config.defaultLocale ?? "en";
    const locales = config.locales ?? [defaultLocale];
    const destination = config.destination ?? defaultDestination;
    const obsolete = config.obsolete ?? "mark";
    const walk = config.walk ?? true;
    const logLevel = config.logLevel ?? "info";
    const exclude = [...defaultExclude, ...normalizeExclude(config.exclude)];
    return { plugins, entrypoints, defaultLocale, locales, destination, obsolete, walk, logLevel, exclude };
}
