import type { ResolvedConfig } from "./configuration.ts";
import type { Logger } from "./logger.ts";

type MaybePromise<T> = T | Promise<T>;

export interface PipelineContext {
    entrypoint: string;
    config: ResolvedConfig;
    generatedAt: Date;
    locale: string;
    logger?: Logger;
}

export interface FileRef {
    path: string;
    namespace: string;
}

export interface HookArgs<T = unknown> {
    file: FileRef;
    data: T;
}

export class ResultGraph {
    #data = new Map<string, Map<string, unknown[]>>();

    add(namespace: string, file: string, result: unknown): void {
        if (!this.#data.has(namespace)) {
            this.#data.set(namespace, new Map());
        }
        const nsMap = this.#data.get(namespace)!;
        if (!nsMap.has(file)) {
            nsMap.set(file, []);
        }
        nsMap.get(file)!.push(result);
    }

    get<T = unknown>(namespace: string, file: string): T[] | undefined {
        return this.#data.get(namespace)?.get(file) as T[] | undefined;
    }

    entries<T = unknown>(namespace: string): Array<[string, T[]]> {
        const nsMap = this.#data.get(namespace);
        if (!nsMap) return [];
        return Array.from(nsMap.entries()) as Array<[string, T[]]>;
    }
}

export interface HookApi {
    context: PipelineContext;
    graph: ResultGraph;
    emit(file: FileRef & { data?: unknown }): void;
    defer(namespace: string): Promise<void>;
}

export type Hook<TIn = unknown, TOut = unknown> = (
    args: HookArgs<TIn>,
    api: HookApi,
) => MaybePromise<TOut | void>;

export interface Build {
    onResolve(options: { filter?: RegExp; namespace?: string }, hook: Hook): void;
    onLoad(options: { filter?: RegExp; namespace?: string }, hook: Hook): void;
    onProcess(options: { filter?: RegExp; namespace?: string }, hook: Hook): void;
    emit(file: FileRef & { data?: unknown }): void;
    context: PipelineContext;
}

export interface Plugin {
    name: string;
    setup(build: Build): void;
}

