import glob from "fast-glob";
import type { ResolvedConfig, ResolvedEntrypoint } from "./configuration.ts";
import { Defer } from "./defer.ts";
import type { Logger } from "./logger.ts";
import type {
    Build,
    Context,
    Filter,
    LoadArgs,
    LoadHook,
    ProcessArgs,
    ProcessHook,
    ResolveArgs,
    ResolveHook,
} from "./plugin.ts";
import { resolveStaticPlugin } from "./plugins/static.ts";

export type Task =
    | {
          type: "resolve";
          args: ResolveArgs;
      }
    | {
          type: "load";
          args: LoadArgs;
      }
    | {
          type: "process";
          args: ProcessArgs;
      };

async function getPaths(entrypoint: ResolvedEntrypoint) {
    const pattern = entrypoint.entrypoint.replace(/\\/g, "/");
    const paths = glob.isDynamicPattern(pattern) ? await glob(pattern, { onlyFiles: true }) : [entrypoint.entrypoint];
    return new Set(paths);
}

export async function run(
    entrypoint: ResolvedEntrypoint,
    { config, logger }: { config: ResolvedConfig; logger?: Logger },
) {
    const destination = entrypoint.destination ?? config.destination;
    const obsolete = entrypoint.obsolete ?? config.obsolete;
    const exclude = entrypoint.exclude ?? config.exclude;
    const walk = entrypoint.walk ?? config.walk;
    const paths = new Set<string>();

    const context: Context = {
        config: { ...config, destination, obsolete, exclude, walk },
        generatedAt: new Date(),
        paths,
        logger,
    };

    logger?.info(entrypoint, "starting extraction");

    const resolvers: { filter: Filter; hook: ResolveHook }[] = [];
    const loaders: { filter: Filter; hook: LoadHook }[] = [];
    const processors: { filter: Filter; hook: ProcessHook }[] = [];
    const hooks = {
        resolve: resolvers,
        load: loaders,
        process: processors,
    };

    const pending = new Map<string, Defer>();
    const queue: Task[] = [];

    function getDeferred(namespace: string) {
        let defer = pending.get(namespace);
        if (defer === undefined) {
            defer = new Defer();
            pending.set(namespace, defer);
        }
        return defer;
    }

    function defer(namespace: string) {
        const defer = getDeferred(namespace);
        return defer.promise;
    }

    function source(path: string) {
        if (paths.has(path)) {
            return;
        }

        logger?.debug({ entrypoint: entrypoint.entrypoint, path }, "resolved path");

        paths.add(path);
        resolve({ entrypoint: path, path, namespace: "source" });
    }

    function resolve(args: ResolveArgs) {
        const { entrypoint, path, namespace } = args;
        const skipped = context.config.exclude.some((ex) => (typeof ex === "function" ? ex(args) : ex.test(args.path)));
        logger?.debug({ entrypoint, path, namespace, skipped }, "resolve");

        if (skipped) {
            return;
        }

        queue.push({ type: "resolve", args });
        getDeferred(namespace).enqueue();
    }

    function load(args: LoadArgs) {
        const { entrypoint, path, namespace } = args;
        logger?.debug({ entrypoint, path, namespace }, "load");

        queue.push({ type: "load", args });
        getDeferred(namespace).enqueue();
    }

    function process(args: ProcessArgs) {
        const { entrypoint, path, namespace } = args;
        logger?.debug({ entrypoint, path, namespace }, "process");

        queue.push({ type: "process", args });
        getDeferred(namespace).enqueue();
    }

    const build: Build = {
        context,
        source,
        resolve,
        load,
        process,
        defer,
        onResolve(filter, hook) {
            resolvers.push({ filter, hook });
        },
        onLoad(filter, hook) {
            loaders.push({ filter, hook });
        },
        onProcess(filter, hook) {
            processors.push({ filter, hook });
        },
    };

    for (const item of config.plugins) {
        const plugin = resolveStaticPlugin(item);
        logger?.debug({ plugin: plugin.name }, "setting up plugin");
        plugin.setup(build);
    }

    for (const path of await getPaths(entrypoint)) {
        source(path);
    }

    async function processTask(task: Task) {
        const { type } = task;
        let args = task.args;
        const { entrypoint, path, namespace } = args;
        logger?.trace({ type, entrypoint, path, namespace }, "processing task");

        for (const { filter, hook } of hooks[type]) {
            if (filter.namespace !== namespace) continue;
            if (filter.filter && !filter.filter.test(path)) continue;

            const result = await hook(args as never);
            if (result !== undefined) {
                args = result as never;
            }
        }

        if (args !== undefined) {
            if (type === "resolve") {
                load(args as never);
            } else if (type === "load") {
                process(args as never);
            }
        }

        getDeferred(namespace).dequeue();
    }

    while (queue.length || Array.from(pending.values()).some((d) => d.pending > 0)) {
        while (queue.length) {
            const task = queue.shift();
            if (!task) {
                break;
            }

            await processTask(task);
        }

        await Promise.all(Array.from(pending.values()).map((d) => d.promise));
        await Promise.resolve();
    }

    logger?.info(entrypoint, "extraction completed");
}
