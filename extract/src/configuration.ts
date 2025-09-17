import { basename, dirname, extname, join } from "node:path";
import type { PluralFormsLocale } from "@let-value/translate";
import type { LevelWithSilent } from "pino";

import type { Plugin } from "./plugin.ts";
import { cleanup } from "./plugins/cleanup/cleanup.ts";
import { core } from "./plugins/core/core.ts";
import { po } from "./plugins/po/po.ts";

export type DestinationFn = (args: { locale: string; entrypoint: string; path: string }) => string;
export type ExcludeFn = (args: { entrypoint: string; path: string }) => boolean;
export type Exclude = RegExp | ExcludeFn;

const defaultPlugins = { core, po, cleanup };
type DefaultPlugins = typeof defaultPlugins;

/**
 * Strategy to handle obsolete translations in existing locale files:
 * - "mark": keep obsolete entries in the locale file but mark them as obsolete
 * - "remove": remove obsolete entries from the locale file
 */
export type ObsoleteStrategy = "mark" | "remove";

export interface EntrypointConfig {
    entrypoint: string;
    destination?: DestinationFn;
    obsolete?: ObsoleteStrategy;
    walk?: boolean;
    exclude?: Exclude | Exclude[];
}

export interface UserConfig {
    /**
     * Default locale to use as the base for extraction
     * @default "en"
     * @see {@link PluralFormsLocale} for available locales
     */
    defaultLocale?: PluralFormsLocale;
    /**
     * Array of locales to extract translations for
     * @default [defaultLocale]
     * @see {@link PluralFormsLocale} for available locales
     */
    locales?: PluralFormsLocale[];
    /**
     * Array of plugins to use or a function to override the default plugins
     * @default DefaultPlugins
     * @see {@link DefaultPlugins} for available plugins
     */
    plugins?: Plugin[] | ((defaultPlugins: DefaultPlugins) => Plugin[]);
    /**
     * One or more entrypoints to extract translations from, could be:
     * - file path, will be treated as a single file entrypoint
     * - glob pattern will be expanded to match files, each treated as a separate entrypoint
     * - configuration object with options for the entrypoint
     * @see {@link EntrypointConfig} for configuration options
     */
    entrypoints: string | EntrypointConfig | Array<string | EntrypointConfig>;
    /**
     * Function to determine the destination path for each extracted locale file
     * @default `./translations/entrypoint.locale.po`
     * @see {@link DestinationFn}
     * @see Can be overridden per entrypoint via `destination` in {@link EntrypointConfig
     */
    destination?: DestinationFn;
    /**
     * Strategy to handle obsolete translations in existing locale files
     * @default "mark"
     * @see {@link ObsoleteStrategy} for available strategies
     * @see Can be overridden per entrypoint via `obsolete` in {@link EntrypointConfig
     */
    obsolete?: ObsoleteStrategy;
    /**
     * Whether to recursively walk dependencies of the entrypoints
     * @default true
     * @see Can be overridden per entrypoint via `walk` in {@link EntrypointConfig}.
     */
    walk?: boolean;
    /**
     * Paths or patterns to exclude from extraction, applied to all entrypoints
     * @default [/node_modules/, /dist/, /build/]
     * @see Can be overridden per entrypoint via `exclude` in {@link EntrypointConfig}.
     */
    exclude?: Exclude | Exclude[];
    /**
     * Log level for the extraction process
     * @default "info"
     */
    logLevel?: LevelWithSilent;
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

function resolveEntrypoint(ep: string | EntrypointConfig): ResolvedEntrypoint {
    if (typeof ep === "string") {
        return { entrypoint: ep };
    }
    const { entrypoint, destination, obsolete, exclude } = ep;
    return { entrypoint, destination, obsolete, exclude: exclude ? normalizeExclude(exclude) : undefined };
}

function resolvePlugins(user?: UserConfig["plugins"]): Plugin[] {
    if (typeof user === "function") {
        return user(defaultPlugins);
    }
    if (Array.isArray(user)) {
        return [...Object.values(defaultPlugins).map((plugin) => plugin()), ...user];
    }
    return Object.values(defaultPlugins).map((plugin) => plugin());
}

/**
 * Type helper to make it easier to use translate.config.ts
 * @param config - {@link UserConfig}.
 */
export function defineConfig(config: UserConfig): ResolvedConfig {
    const defaultLocale = config.defaultLocale ?? "en";

    const plugins = resolvePlugins(config.plugins);

    const raw = Array.isArray(config.entrypoints) ? config.entrypoints : [config.entrypoints];
    const entrypoints = raw.map(resolveEntrypoint);

    return {
        plugins,
        entrypoints,
        defaultLocale,
        locales: config.locales ?? [defaultLocale],
        destination: config.destination ?? defaultDestination,
        obsolete: config.obsolete ?? "mark",
        walk: config.walk ?? true,
        logLevel: config.logLevel ?? "info",
        exclude: config.exclude ? normalizeExclude(config.exclude) : defaultExclude,
    };
}
