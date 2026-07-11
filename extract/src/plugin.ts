import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";
import type { Translation } from "./plugins/core/queries/types.ts";
import type { StaticPlugin } from "./static.ts";

type MaybePromise<T> = T | Promise<T>;

export interface Context {
    config: ResolvedConfig;
    generatedAt: Date;
    /** Entrypoint roots discovered in this run (including promoted ones). */
    paths: Set<string>;
    logger?: Logger;
}

export interface ImportReference {
    spec: string;
    kind: "static" | "dynamic";
    typeOnly: boolean;
}

/** Arguments passed to exclude filters. */
export interface ResolveArgs<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    import?: ImportReference;
    data?: TInput;
}

export interface SourceArgs {
    entrypoint: string;
    path: string;
    import?: ImportReference;
}

export interface LoadArgs {
    entrypoint: string;
    path: string;
}

/** Produces the contents of a source file; return undefined to let the next loader try. */
export type LoadHook = (args: LoadArgs) => MaybePromise<string | undefined>;

export interface ProcessArgs {
    entrypoint: string;
    path: string;
    contents: string;
    /** Emits translations extracted from this file. */
    emit(translations: Translation[]): void;
}

/** Runs for every loaded source file. Return a non-undefined value to stop later processors for this file. */
export type ProcessHook = (args: ProcessArgs) => MaybePromise<unknown>;

export interface FileTranslations {
    path: string;
    translations: Translation[];
}

export interface CollectedArgs {
    entrypoint: string;
    /** Translations of every processed source file of this entrypoint, one entry per file. */
    files: FileTranslations[];
    /** Schedules an output artifact. Outputs run in parallel; writes to the same path are serialized. */
    output(path: string, produce: () => MaybePromise<void>): void;
}

/** Runs once per entrypoint, after all of its source files settled and translations are known. */
export type CollectedHook = (args: CollectedArgs) => MaybePromise<void>;

export interface OutputsArgs {
    /** Every output path produced in this run, across all entrypoints. */
    outputs: string[];
}

/** Runs once per run, after every entrypoint produced its outputs. */
export type OutputsHook = (args: OutputsArgs) => MaybePromise<void>;

export interface Build {
    context: Context;
    /**
     * Discovers a source file. When `path` equals `entrypoint` a new
     * extraction pipeline is started for it (entrypoint promotion);
     * otherwise the file joins the given entrypoint's walk. Excluded and
     * already-known paths are ignored.
     */
    source(args: SourceArgs): void;
    onLoad(filter: RegExp, hook: LoadHook): void;
    onProcess(filter: RegExp, hook: ProcessHook): void;
    onCollected(hook: CollectedHook): void;
    onOutputs(hook: OutputsHook): void;
}

export interface Plugin {
    name: string;
    setup(build: Build): void;
}

export type UniversalPlugin = Plugin | StaticPlugin;
