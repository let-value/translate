import type { ResolvedConfig } from "./configuration.ts";

type MaybePromise<T> = T | Promise<T>;

export interface ExtractContext {
    entry: string;
    dest: string;
    config: ResolvedConfig;
}

export interface ResolveArgs {
    entrypoint: string;
    path: string;
}

export type ResolveResult = ResolveArgs & {
    entrypoint: string;
    path: string;
};

export type ResolveHook = (args: ResolveArgs, ctx: ExtractContext) => MaybePromise<ResolveResult>;

export type LoadArgs = ResolveResult;

export type LoadResult = LoadArgs & {
    contents: string;
};

export type LoadHook = (args: LoadArgs, ctx: ExtractContext) => MaybePromise<LoadResult | undefined>;

export type ExtractArgs = LoadResult;

export type ExtractResult = ResolveResult & {
    translations: unknown;
};

export type ExtractHook = (args: ExtractArgs, ctx: ExtractContext) => MaybePromise<ExtractResult | undefined>;

export type CollectArgs = ExtractResult;

export type CollectResult = ExtractResult & {
    destination: string;
};

export type CollectHook = (args: CollectArgs, ctx: ExtractContext) => MaybePromise<CollectResult | undefined>;

export type GenerateArgs = {
    entrypoint: string;
    path: string;
    locale: string;
    collected: CollectResult[];
};

export type GenerateHook = (args: GenerateArgs, ctx: ExtractContext) => MaybePromise<void>;

export interface ExtractBuild {
    onResolve(options: { filter: RegExp }, hook: ResolveHook): void;
    onLoad(options: { filter: RegExp }, hook: LoadHook): void;
    onExtract(options: { filter: RegExp }, hook: ExtractHook): void;
    onCollect(options: { filter: RegExp }, hook: CollectHook): void;
    onGenerate(options: { filter: RegExp }, hook: GenerateHook): void;
    resolvePath(args: ResolveArgs): void;
    context: ExtractContext;
}

export interface ExtractorPlugin {
    name: string;
    setup(build: ExtractBuild): void;
}
