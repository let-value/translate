import { globSync } from "glob";
import type { ResolvedConfig, ResolvedEntrypoint } from "./configuration.ts";
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

type Task =
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

class Defer {
    pending = 0;
    promise: Promise<void> = Promise.resolve();
    resolve?: () => void;

    enqueue() {
        if (this.pending++ === 0) {
            this.promise = new Promise<void>((res) => {
                this.resolve = res;
            });
        }
    }
    dequeue() {
        if (this.pending > 0 && --this.pending === 0) {
            this.resolve?.();
        }
    }
}

export async function run(
    entrypoint: ResolvedEntrypoint,
    { config, logger }: { config: ResolvedConfig; logger?: Logger },
) {
    const destination = entrypoint?.destination ?? config.destination;
    const obsolete = entrypoint?.obsolete ?? config.obsolete;
    const exclude = entrypoint?.exclude ?? config.exclude;

    const defaultLocale = config.defaultLocale;

    logger?.info({ entrypoint }, "starting extraction");

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
        let d = pending.get(namespace);
        if (d === undefined) {
            d = new Defer();
            pending.set(namespace, d);
        }
        return d;
    }

    function defer(namespace: string) {
        const d = getDeferred(namespace);
        return d.promise;
    }

    function resolve(args: ResolveArgs) {
        if (
            args.path !== args.entrypoint &&
            (!context.config.walk ||
                context.config.exclude.some((ex) =>
                    typeof ex === "function" ? ex(args.path) : ex.test(args.path),
                ))
        ) {
            return;
        }
        queue.push({ type: "resolve", args });
        getDeferred(args.namespace).enqueue();
    }

    function load(args: LoadArgs) {
        queue.push({ type: "load", args });
        getDeferred(args.namespace).enqueue();
    }

    function process(args: ProcessArgs) {
        queue.push({ type: "process", args });
        getDeferred(args.namespace).enqueue();
    }

    const context: Context = {
        config: { ...config, destination, obsolete, exclude },
        generatedAt: new Date(),
        logger,
    };

    const build: Build = {
        context,
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

    for (const plugin of config.plugins) {
        logger?.debug({ plugin: plugin.name }, "setting up plugin");
        plugin.setup(build);
    }

    const paths = globSync(entrypoint.entrypoint, { nodir: true });
    if (paths.length === 0) {
        resolve({ entrypoint: entrypoint.entrypoint, path: entrypoint.entrypoint, namespace: "source" });
    } else {
        for (const path of paths) {
            resolve({ entrypoint: entrypoint.entrypoint, path, namespace: "source" });
        }
    }

    while (queue.length || Array.from(pending.values()).some((d) => d.pending > 0)) {
        while (queue.length) {
            const task = queue.shift();
            if (!task) {
                break;
            }

            const { type } = task;
            let args = task.args;

            for (const {
                filter: { filter, namespace },
                hook,
            } of hooks[type]) {
                if (namespace !== args.namespace) continue;
                if (filter && !filter.test(args.path)) continue;

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

            getDeferred(task.args.namespace).dequeue();
        }

        await Promise.all(Array.from(pending.values()).map((d) => d.promise));
        await Promise.resolve();
    }

    logger?.info({ entrypoint, locale: defaultLocale }, "extraction completed");
}
