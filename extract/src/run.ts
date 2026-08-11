import { realpathSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { Graph, type Scope } from "@let-value/graph";
import glob from "fast-glob";
import type { ResolvedConfig, ResolvedEntrypoint } from "./configuration.ts";
import { isExcluded } from "./exclude.ts";
import type { Logger } from "./logger.ts";
import type {
    Build,
    CollectedHook,
    Context,
    FileTranslations,
    ImportReference,
    LoadHook,
    OutputsHook,
    ProcessHook,
} from "./plugin.ts";
import type { Translation } from "./plugins/core/queries/types.ts";
import { resolveStaticPlugin } from "./plugins/static.ts";

/** A pending write requested by an onCollected hook via output(). */
type Contribution = { path: string; produce: () => unknown };

async function getPaths(entrypoint: ResolvedEntrypoint) {
    const pattern = entrypoint.entrypoint.replace(/\\/g, "/");
    const paths = glob.isDynamicPattern(pattern) ? await glob(pattern, { onlyFiles: true }) : [entrypoint.entrypoint];
    return new Set(paths.map((path) => resolvePath(path)));
}

function toRealPath(path: string) {
    const abs = resolvePath(path);
    try {
        return realpathSync(abs);
    } catch {
        return abs;
    }
}

export async function run(
    entrypoint: ResolvedEntrypoint,
    { config, logger }: { config: ResolvedConfig; logger?: Logger },
) {
    const destination = entrypoint.destination ?? config.destination;
    const obsolete = entrypoint.obsolete ?? config.obsolete;
    const exclude = entrypoint.exclude ?? config.exclude;
    const walk = entrypoint.walk ?? config.walk;

    const context: Context = {
        config: { ...config, destination, obsolete, exclude, walk },
        generatedAt: new Date(),
        paths: new Set<string>(),
        logger,
    };

    logger?.info(entrypoint, "starting extraction");

    const loaders: { filter: RegExp; hook: LoadHook }[] = [];
    const processors: { filter: RegExp; hook: ProcessHook }[] = [];
    const collectors: CollectedHook[] = [];
    const finalizers: OutputsHook[] = [];

    // Failures are contained at the entrypoint boundary instead of rejecting
    // the node that hit them: letting a rejection propagate would skip every
    // downstream node in the run, so one unreadable file would leave every
    // other entrypoint without output. A broken entrypoint still writes
    // nothing — a .po merged from a partial source set would obsolete or drop
    // the messages it failed to see — and the run rejects once at the end.
    const failures: unknown[] = [];
    const failed = new Set<string>();

    /** Records a failure that leaves `scope`'s translations incomplete. */
    function fail(scope: string, path: string, error: unknown) {
        failed.add(scope);
        record({ entrypoint: scope, path }, error);
    }

    /** Records a failure that no longer has an entrypoint to invalidate. */
    function record(where: Record<string, string>, error: unknown) {
        failures.push(error);
        logger?.error({ ...where, error }, "extraction failed");
    }

    const graph = new Graph();
    const source = graph.kind<string | undefined>("source");
    // A collect node's value is what its hook asked to write; a root plan
    // node fans contributions in per destination, so writers of the same
    // output path become a single node instead of racing.
    const collect = graph.kind<Contribution[]>("collect");
    const plan = graph.kind<void>("plan");
    const output = graph.kind<string | undefined>("output");
    const finalize = graph.kind<void>("finalize");

    // One worker per source file runs the processor hooks in registration
    // order; a hook returning non-undefined stops the chain for that file.
    // Whatever the hooks emit becomes the worker's value, which the
    // per-entrypoint completion collects.
    const processed = graph.each(source, "process", async (node, contents): Promise<FileTranslations | undefined> => {
        if (contents === undefined) {
            return undefined;
        }
        const path = node.key;
        let emitted: FileTranslations | undefined;
        const args = {
            entrypoint: node.scope.name,
            path,
            contents,
            emit(translations: Translation[]) {
                emitted ??= { path, translations: [] };
                emitted.translations.push(...translations);
            },
        };
        try {
            for (const { filter, hook } of processors) {
                if (!filter.test(path)) {
                    continue;
                }
                if ((await hook(args)) !== undefined) {
                    break;
                }
            }
        } catch (error) {
            fail(node.scope.name, path, error);
            return undefined;
        }
        return emitted;
    });

    function addSource(scope: Scope, path: string, importReference?: ImportReference) {
        if (scope.get(source, path)) {
            return;
        }
        const args = { entrypoint: scope.name, path, namespace: "source", import: importReference };
        if (isExcluded(args, context.config.exclude)) {
            logger?.debug(args, "excluded");
            return;
        }
        logger?.debug({ entrypoint: scope.name, path }, "source");
        scope.add(source, path, async () => {
            try {
                for (const { filter, hook } of loaders) {
                    if (!filter.test(path)) {
                        continue;
                    }
                    const contents = await hook({ entrypoint: scope.name, path });
                    if (contents !== undefined) {
                        return contents;
                    }
                }
            } catch (error) {
                fail(scope.name, path, error);
            }
            return undefined;
        });
    }

    // Each entrypoint (initial or promoted mid-run) gets its own scope: its
    // walk, translation collection, and outputs are independent from other
    // entrypoints in the same run.
    function pipeline(path: string) {
        if (context.paths.has(path)) {
            return;
        }
        context.paths.add(path);
        const scope = graph.scope(path);
        addSource(scope, path);

        const collected = scope.completion(processed);
        collectors.forEach((hook, index) => {
            scope.add(collect, String(index), {
                dependencies: [collected],
                run: async (_node, files) => {
                    if (failed.has(path)) {
                        logger?.warn({ entrypoint: path }, "skipping outputs: entrypoint failed");
                        return [];
                    }
                    const contributions: Contribution[] = [];
                    try {
                        await hook({
                            entrypoint: path,
                            files: files.filter((file) => file !== undefined),
                            output: (outputPath, produce) => {
                                contributions.push({ path: outputPath, produce });
                            },
                        });
                    } catch (error) {
                        fail(path, path, error);
                        return [];
                    }
                    return contributions;
                },
            });
        });
    }

    const build: Build = {
        context,
        source({ entrypoint: sourceEntrypoint, path, import: importReference }) {
            if (sourceEntrypoint === path) {
                pipeline(toRealPath(path));
                return;
            }
            addSource(graph.scope(sourceEntrypoint), path, importReference);
        },
        onLoad(filter, hook) {
            loaders.push({ filter, hook });
        },
        onProcess(filter, hook) {
            processors.push({ filter, hook });
        },
        onCollected(hook) {
            collectors.push(hook);
        },
        onOutputs(hook) {
            finalizers.push(hook);
        },
    };

    for (const item of config.plugins) {
        const plugin = resolveStaticPlugin(item);
        logger?.debug({ plugin: plugin.name }, "setting up plugin");
        plugin.setup(build);
    }

    // Once every entrypoint has collected, group contributions by destination
    // and spawn one writer node per output path: same-file writes are ordered
    // by structure, not by locks.
    const contributed = graph.root.completion(collect);
    graph.root.add(plan, "outputs", {
        dependencies: [contributed],
        run: (_node, collections) => {
            const byPath = new Map<string, Contribution[]>();
            for (const contribution of collections.flat()) {
                const group = byPath.get(contribution.path) ?? [];
                group.push(contribution);
                byPath.set(contribution.path, group);
            }
            for (const [outputPath, contributions] of byPath) {
                graph.root.add(output, outputPath, {
                    dependencies: [contributed],
                    run: async () => {
                        try {
                            for (const { produce } of contributions) {
                                await produce();
                            }
                        } catch (error) {
                            // A half-written artifact is not reported as an
                            // output, so finalizers never treat it as ours.
                            record({ output: outputPath }, error);
                            return undefined;
                        }
                        return outputPath;
                    },
                });
            }
        },
    });

    // Finalizers see the outputs of every entrypoint of this run, so cleanup
    // can reason about directories shared between entrypoints.
    const outputs = graph.root.completion(output);
    finalizers.forEach((hook, index) => {
        graph.root.add(finalize, String(index), {
            dependencies: [outputs],
            run: async (_node, produced) => {
                try {
                    await hook({ outputs: produced.filter((path) => path !== undefined) });
                } catch (error) {
                    record({ finalizer: String(index) }, error);
                }
            },
        });
    });

    for (const path of await getPaths(entrypoint)) {
        pipeline(toRealPath(path));
    }

    // Nothing above rethrows, so a rejection here is the scheduler itself
    // failing rather than a hook.
    await graph.run().catch((error: unknown) => {
        record({ graph: "run" }, error);
    });

    if (failures.length > 0) {
        throw new AggregateError(failures, `Extraction of "${entrypoint.entrypoint}" failed`);
    }

    logger?.info(entrypoint, "extraction completed");
}
