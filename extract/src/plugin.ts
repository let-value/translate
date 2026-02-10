import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";
import type { StaticPlugin } from "./static.ts";

type MaybePromise<T> = T | Promise<T>;

export interface Context {
    config: ResolvedConfig;
    generatedAt: Date;
    entrypoints: Set<string>;
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

export type UniversalPlugin = Plugin | StaticPlugin;
