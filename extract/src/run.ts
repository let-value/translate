import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";
import type { Build, FileRef, Hook, HookApi, PipelineContext } from "./plugin.ts";
import { ResultGraph } from "./plugin.ts";

function createDeferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

interface Task extends FileRef {
    data?: unknown;
}

export async function run(entrypoint: string, { config, logger }: { config: ResolvedConfig; logger?: Logger }) {
    const entryConfig = config.entrypoints.find((e) => e.entrypoint === entrypoint);
    const destination = entryConfig?.destination ?? config.destination;
    const obsolete = entryConfig?.obsolete ?? config.obsolete;
    const exclude = entryConfig?.exclude ?? config.exclude;

    const defaultLocale = config.defaultLocale;

    logger?.info({ entrypoint, locale: defaultLocale }, "starting extraction");

    const context: PipelineContext = {
        entrypoint,
        config: { ...config, destination, obsolete, exclude },
        generatedAt: new Date(),
        locale: defaultLocale,
        logger,
    };

    const hooks: Record<"resolve" | "load" | "process", { namespace: string; filter?: RegExp; hook: Hook }[]> = {
        resolve: [],
        load: [],
        process: [],
    };

    const pending = new Map<string, number>();
    const queue: Task[] = [];

    function emit(ref: FileRef & { data?: unknown }) {
        const namespace = ref.namespace ?? "source";
        const path = ref.path;
        if (namespace === "source") {
            for (const ex of context.config.exclude) {
                if (ex instanceof RegExp ? ex.test(path) : ex(path)) return;
            }
            if (!context.config.walk && path !== entrypoint) return;
        }
        queue.push({ path, namespace, data: ref.data });
        pending.set(namespace, (pending.get(namespace) ?? 0) + 1);
    }

    const build: Build = {
        onResolve({ filter = /.*/, namespace = "source" }, hook) {
            hooks.resolve.push({ namespace, filter, hook });
        },
        onLoad({ filter = /.*/, namespace = "source" }, hook) {
            hooks.load.push({ namespace, filter, hook });
        },
        onProcess({ filter = /.*/, namespace = "source" }, hook) {
            hooks.process.push({ namespace, filter, hook });
        },
        emit,
        context,
    };

    for (const plugin of config.plugins) {
        logger?.debug({ plugin: plugin.name }, "setting up plugin");
        plugin.setup(build);
    }

    emit({ path: entrypoint, namespace: "source" });

    const defers = new Map<string, { promise: Promise<void>; resolve: () => void }>();
    function getDeferred(ns: string) {
        let d = defers.get(ns);
        if (!d) {
            d = createDeferred();
            defers.set(ns, d);
        }
        return d;
    }

    const graph = new ResultGraph();

    const api: HookApi = {
        context,
        graph,
        emit,
        defer(namespace) {
            if ((pending.get(namespace) ?? 0) === 0) return Promise.resolve();
            return getDeferred(namespace).promise;
        },
    };

    const visitedSource = new Set<string>();

    async function apply(stage: "resolve" | "load" | "process", task: Task) {
        let { path, namespace, data } = task;
        for (const { namespace: ns, filter, hook } of hooks[stage]) {
            if (ns !== namespace) continue;
            if (filter && !filter.test(path)) continue;
            const result = await hook({ file: { path, namespace }, data }, api);
            if (result !== undefined) {
                if (stage === "resolve") {
                    path = result as string;
                } else if (stage === "load") {
                    data = result;
                } else if (stage === "process") {
                    graph.add(namespace, path, result);
                }
            }
        }
        task.path = path;
        task.data = data;
    }

    while (queue.length) {
        const task = queue.shift()!;
        if (task.namespace === "source") {
            if (visitedSource.has(task.path)) {
                const count = (pending.get(task.namespace) ?? 1) - 1;
                pending.set(task.namespace, count);
                if (count === 0) getDeferred(task.namespace).resolve();
                continue;
            }
            visitedSource.add(task.path);
        }
        await apply("resolve", task);
        await apply("load", task);
        await apply("process", task);
        const ns = task.namespace;
        const count = (pending.get(ns) ?? 1) - 1;
        pending.set(ns, count);
        if (count === 0) {
            const d = defers.get(ns);
            d?.resolve();
        }
    }

    logger?.info({ entrypoint, locale: defaultLocale }, "extraction completed");

    return graph;
}
