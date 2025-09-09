import { join } from "node:path";
import type { ResolvedConfig } from "./configuration.ts";
import type {
    CollectArgs,
    CollectHook,
    CollectResult,
    ExtractArgs,
    ExtractBuild,
    ExtractContext,
    ExtractHook,
    ExtractorPlugin,
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
    plugins: ExtractorPlugin[],
    locale: string,
    opts: { dest?: string; config: ResolvedConfig },
) {
    const entryConfig = opts.config.entrypoints.find((e) => e.entrypoint === entrypoint);
    const destination = entryConfig?.destination ?? opts.config.destination;
    const obsolete = entryConfig?.obsolete ?? opts.config.obsolete;

    const queue: ResolveArgs[] = [{ entrypoint, path: entrypoint }];
    const context: ExtractContext = {
        entry: entrypoint,
        dest: opts.dest ?? process.cwd(),
        config: { ...opts.config, destination, obsolete },
        generatedAt: new Date(),
        locale,
    };

    const resolves: { filter: RegExp; hook: ResolveHook }[] = [];
    const loads: { filter: RegExp; hook: LoadHook }[] = [];
    const extracts: { filter: RegExp; hook: ExtractHook }[] = [];
    const collects: { filter: RegExp; hook: CollectHook }[] = [];
    const generates: { filter: RegExp; hook: GenerateHook }[] = [];

    function resolvePath(args: ResolveArgs) {
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

    for (const plugin of plugins) {
        plugin.setup(build);
    }

    const visited = new Set<string>();
    const results: ExtractResult[] = [];

    async function applyResolve({ entrypoint, path }: ResolveArgs): Promise<ResolveResult | undefined> {
        for (const { filter, hook } of resolves) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path }, context);
            if (result) return result;
        }
        return undefined;
    }

    async function applyLoad({ entrypoint, path }: LoadArgs): Promise<LoadResult | undefined> {
        for (const { filter, hook } of loads) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path }, context);
            if (result) return result;
        }
        return undefined;
    }

    async function applyExtract({ entrypoint, path, contents }: ExtractArgs): Promise<ExtractResult | undefined> {
        for (const { filter, hook } of extracts) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path, contents }, context);
            if (result) return result;
        }
        return undefined;
    }

    async function applyCollect({ entrypoint, path, translations }: CollectArgs): Promise<CollectResult | undefined> {
        for (const { filter, hook } of collects) {
            if (!filter.test(path)) continue;
            const result = await hook({ entrypoint, path, translations }, context);
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

        const collected = await applyCollect(extracted);
        if (!collected) continue;

        const destPath = context.config.destination(locale, entrypoint, collected.destination);
        const final = { ...collected, destination: destPath };
        if (!result[destPath]) {
            result[destPath] = [];
        }

        result[destPath].push(final);
    }

    for (const [path, collected] of Object.entries(result)) {
        const fullPath = join(context.dest, path);
        for (const { filter, hook } of generates) {
            if (!filter.test(fullPath)) continue;
            await hook({ entrypoint, locale, path: fullPath, collected }, context);
        }
    }

    return results;
}
