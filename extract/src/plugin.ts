import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";

type MaybePromise<T> = T | Promise<T>;

export interface Context {
    config: ResolvedConfig;
    generatedAt: Date;
    logger?: Logger;
}

export interface ResolveArgs<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data?: TInput;
}

export interface ResolveResult<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data?: TInput;
}

export interface LoadArgs<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data?: TInput;
}

export interface LoadResult<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data: TInput;
}

export interface ProcessArgs<TInput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data: TInput;
}

export interface ProcessResult<TOutput = unknown> {
    entrypoint: string;
    path: string;
    namespace: string;
    data: TOutput;
}

export class ResultGraph {
    data = new Map<string, Map<string, unknown[]>>();

    add(namespace: string, path: string, result: unknown): void {
        if (!this.data.has(namespace)) {
            this.data.set(namespace, new Map());
        }
        // biome-ignore lint/style/noNonNullAssertion: true
        const map = this.data.get(namespace)!;
        if (!map.has(path)) {
            map.set(path, []);
        }
        // biome-ignore lint/style/noNonNullAssertion: true
        map.get(path)!.push(result);
    }

    get<T = unknown>(namespace: string, path: string): T[] | undefined {
        return this.data.get(namespace)?.get(path) as T[] | undefined;
    }

    entries<T = unknown>(namespace: string): Array<[string, T[]]> {
        const nsMap = this.data.get(namespace);
        if (!nsMap) return [];
        return Array.from(nsMap.entries()) as Array<[string, T[]]>;
    }
}

export type Filter = { filter: RegExp; namespace?: string };
export type ResolveHook<TInput = unknown> = (
    args: ResolveArgs<TInput>,
) => MaybePromise<ResolveResult<TInput> | undefined>;
export type LoadHook<TInput = unknown> = (args: LoadArgs<TInput>) => MaybePromise<LoadResult<TInput> | undefined>;
export type ProcessHook<TInput = unknown, TOutput = unknown> = (
    args: ProcessArgs<TInput>,
) => MaybePromise<ProcessResult<TOutput> | undefined>;

export interface Build<TInput = unknown, TOutput = unknown> {
    context: Context;
    resolve(args: ResolveArgs<unknown>): void;
    load(args: LoadArgs<unknown>): void;
    process(args: ProcessArgs<unknown>): void;
    defer(namespace: string): Promise<void>;
    onResolve(options: Filter, hook: ResolveHook<TInput>): void;
    onLoad(options: Filter, hook: LoadHook<TInput>): void;
    onProcess(options: Filter, hook: ProcessHook<TInput, TOutput>): void;
}

export interface Plugin<TInput = unknown, TOutput = unknown> {
    name: string;
    setup(build: Build<TInput, TOutput>): void;
}
