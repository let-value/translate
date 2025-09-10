import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";
import type {
    CollectArgs,
    CollectHook,
    CollectResult,
    ExtractArgs,
    ExtractBuild,
    ExtractContext,
    ExtractHook,
    ExtractResult,
    GenerateHook,
    LoadArgs,
    LoadHook,
    LoadResult,
    ResolveArgs,
    ResolveHook,
    ResolveResult,
} from "./plugin.ts";

export async function run(
    entrypoint: string,
    { locale, config, logger }: { locale: string; config: ResolvedConfig; logger?: Logger },
) {
    const entryConfig = config.entrypoints.find((e) => e.entrypoint === entrypoint);
    const destination = entryConfig?.destination ?? config.destination;
    const obsolete = entryConfig?.obsolete ?? config.obsolete;
    const exclude = entryConfig?.exclude ?? config.exclude;

    const queue: ResolveArgs[] = [{ entrypoint, path: entrypoint }];

    logger?.info({ entrypoint, locale }, "starting extraction");

    const context: ExtractContext = {
        entrypoint,
        config: { ...config, destination, obsolete, exclude },
        generatedAt: new Date(),
        locale,
        logger,
    };

    const resolves: { filter: RegExp; hook: ResolveHook }[] = [];
    const loads: { filter: RegExp; hook: LoadHook }[] = [];
    const extracts: { filter: RegExp; hook: ExtractHook }[] = [];
    const collects: { filter: RegExp; hook: CollectHook }[] = [];
    const generates: { filter: RegExp; hook: GenerateHook }[] = [];

    function resolvePath(args: ResolveArgs) {
        for (const ex of context.config.exclude) {
            if (ex instanceof RegExp ? ex.test(args.path) : ex(args.path)) {
                return;
            }
        }
        if (context.config.walk) {
            queue.push(args);
        }
    }

    const build: ExtractBuild = {
        onResolve({ filter }, hook) {
            resolves.push({ filter, hook });
        },
        onLoad({ filter }, hook) {
            loads.push({ filter, hook });
        },
        onExtract({ filter }, hook) {
            extracts.push({ filter, hook });
        },
        onCollect({ filter }, hook) {
            collects.push({ filter, hook });
        },
        onGenerate({ filter }, hook) {
            generates.push({ filter, hook });
        },
        resolvePath,
        context,
    };

    for (const plugin of config.plugins) {
        logger?.debug({ plugin: plugin.name }, "setting up plugin");
        plugin.setup(build);
    }

    const visited = new Set<string>();
    const results: ExtractResult[] = [];

    async function applyResolve({ entrypoint, path }: ResolveArgs): Promise<ResolveResult | undefined> {
        for (const { filter, hook } of resolves) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path }, context);
            if (result) {
                logger?.debug(result, "resolved");
            }
            if (result) return result;
        }
        return undefined;
    }

    async function applyLoad({ entrypoint, path }: LoadArgs): Promise<LoadResult | undefined> {
        for (const { filter, hook } of loads) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path }, context);
            if (result) {
                logger?.debug({ entrypoint, path }, "loaded");
            }
            if (result) return result;
        }
        return undefined;
    }

    async function applyExtract({ entrypoint, path, contents }: ExtractArgs): Promise<ExtractResult | undefined> {
        for (const { filter, hook } of extracts) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path, contents }, context);
            if (result) {
                logger?.debug({ entrypoint, path }, "extracted");
            }
            if (result) return result;
        }
        return undefined;
    }

    async function applyCollect({
        entrypoint,
        path,
        translations,
        destination,
    }: CollectArgs): Promise<CollectResult | undefined> {
        for (const { filter, hook } of collects) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path, translations, destination }, context);
            if (result) {
                logger?.debug(
                    {
                        entrypoint,
                        path,
                        destination,
                        ...(destination !== result.destination && { redirected: result.destination }),
                    },
                    "collected",
                );
            }
            if (result) return result;
        }
        return undefined;
    }

    const result: Record<string, CollectResult[]> = {};

    while (queue.length) {
        // biome-ignore lint/style/noNonNullAssertion: queue is checked above
        const args = queue.shift()!;
        const resolved = await applyResolve(args);
        if (!resolved || visited.has(resolved.path)) continue;
        visited.add(resolved.path);

        const loaded = await applyLoad(resolved);
        if (!loaded) continue;

        const extracted = await applyExtract(loaded);
        if (!extracted) continue;

        const destination = context.config.destination({ entrypoint, locale, path: resolved.path });
        const collected = await applyCollect({ ...extracted, destination });
        if (!collected) continue;

        if (!result[collected.destination]) {
            result[collected.destination] = [];
        }

        result[collected.destination].push(collected);
    }

    for (const [path, collected] of Object.entries(result)) {
        for (const { filter, hook } of generates) {
            if (!filter.test(path)) continue;
            logger?.info({ path }, "generating output");
            await hook({ entrypoint, path, collected }, context);
        }
    }

    logger?.info({ entrypoint, locale }, "extraction completed");
    return results;
}
