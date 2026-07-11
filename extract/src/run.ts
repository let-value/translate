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

    const graph = new Graph();
    const source = graph.kind<string | undefined>("source");
    const collect = graph.kind<void>("collect");
    // Serial: writers of the same output path never overlap, even when
    // several entrypoints target the same file.
    const output = graph.kind<string>("output", { serial: true });
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
        for (const { filter, hook } of processors) {
            if (!filter.test(path)) {
                continue;
            }
            if ((await hook(args)) !== undefined) {
                break;
            }
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
            for (const { filter, hook } of loaders) {
                if (!filter.test(path)) {
                    continue;
                }
                const contents = await hook({ entrypoint: scope.name, path });
                if (contents !== undefined) {
                    return contents;
                }
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
                run: (_node, files) =>
                    hook({
                        entrypoint: path,
                        files: files.filter((file) => file !== undefined),
                        output: (outputPath, produce) => {
                            scope.ensure(output, outputPath, {
                                dependencies: [collected],
                                run: async () => {
                                    await produce();
                                    return outputPath;
                                },
                            });
                        },
                    }),
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

    // Finalizers see the outputs of every entrypoint of this run, so cleanup
    // can reason about directories shared between entrypoints.
    const outputs = graph.root.completion(output);
    finalizers.forEach((hook, index) => {
        graph.root.add(finalize, String(index), {
            dependencies: [outputs],
            run: (_node, produced) => hook({ outputs: produced }),
        });
    });

    for (const path of await getPaths(entrypoint)) {
        pipeline(toRealPath(path));
    }

    await graph.run();

    logger?.info(entrypoint, "extraction completed");
}
