import type { GetTextTranslation } from "gettext-parser";
import type { Message } from "./messages.ts";

/** Utility type allowing a hook to return a value or a promise. */
type MaybePromise<T> = T | Promise<T>;

/** Shared context available to all hooks and plugins. */
export interface ExtractContext {
    /** Path to the original entry file being processed. */
    entry: string;
    /** Destination directory for generated artifacts. */
    dest: string;
    /** Arbitrary cache shared across plugins. */
    cache: Map<string, unknown>;
    /** Shared mutable data for coordination between plugins. */
    shared: Record<string, unknown>;
    /** Queue additional files for the pipeline to process. */
    emitFile(path: string, importer?: string): void;
}

export interface ResolveArgs {
    path: string;
    importer?: string;
}

export type ResolveResult = string | undefined;
export type ResolveHook = (args: ResolveArgs, ctx: ExtractContext) => MaybePromise<ResolveResult>;

export interface LoadArgs {
    path: string;
}

export interface LoadResult {
    contents: string;
}
export type LoadHook = (args: LoadArgs, ctx: ExtractContext) => MaybePromise<LoadResult | undefined>;

export interface ExtractArgs {
    path: string;
    contents: string;
}

export interface ExtractResult {
    messages: GetTextTranslation[];
    imports: string[];
}
export type ExtractHook = (args: ExtractArgs, ctx: ExtractContext) => MaybePromise<ExtractResult | undefined>;

export interface GenerateArgs {
    locale: string;
    messages: Message[];
}

export type CollectHook = (messages: GetTextTranslation[], ctx: ExtractContext) => MaybePromise<Message[] | undefined>;
export type GenerateHook = (args: GenerateArgs, ctx: ExtractContext) => MaybePromise<void>;

export interface ExtractBuild {
    onResolve(options: { filter: RegExp }, hook: ResolveHook): void;
    onLoad(options: { filter: RegExp }, hook: LoadHook): void;
    onExtract(options: { filter: RegExp }, hook: ExtractHook): void;
    onCollect(hook: CollectHook): void;
    onGenerate(hook: GenerateHook): void;
    /** Allow plugins to enqueue new files during setup. */
    emitFile(path: string, importer?: string): void;
    context: ExtractContext;
}

export interface ExtractorPlugin {
    name: string;
    setup(build: ExtractBuild): void;
}

/**
 * Run the extraction pipeline starting from an entry file using the provided plugins.
 * Hooks are executed in order: resolve -> load -> extract -> collect -> generate.
 */
export async function runPipeline(
    entry: string,
    plugins: ExtractorPlugin[],
    locale: string,
    opts: { dest?: string } = {},
): Promise<GetTextTranslation[]> {
    const queue: { path: string; importer?: string }[] = [{ path: entry }];
    const context: ExtractContext = {
        entry,
        dest: opts.dest ?? process.cwd(),
        cache: new Map(),
        shared: {},
        emitFile(path, importer) {
            queue.push({ path, importer });
        },
    };

    const resolves: { filter: RegExp; hook: ResolveHook }[] = [];
    const loads: { filter: RegExp; hook: LoadHook }[] = [];
    const extracts: { filter: RegExp; hook: ExtractHook }[] = [];
    const collects: CollectHook[] = [];
    const generates: GenerateHook[] = [];

    const build: ExtractBuild = {
        onResolve({ filter }, hook) {
            resolves.push({ filter, hook });
        },
        onLoad({ filter }, hook) {
            loads.push({ filter, hook });
        },
        onExtract({ filter }, hook) {
            extracts.push({ filter, hook });
        },
        onCollect(hook) {
            collects.push(hook);
        },
        onGenerate(hook) {
            generates.push(hook);
        },
        emitFile: context.emitFile,
        context,
    };

    for (const plugin of plugins) {
        plugin.setup(build);
    }

    const visited = new Set<string>();
    const messages: GetTextTranslation[] = [];
    let collected: Message[] = [];

    async function applyResolve(path: string, importer?: string): Promise<string | undefined> {
        for (const { filter, hook } of resolves) {
            if (!filter.test(path)) continue;
            const result = await hook({ path, importer }, context);
            if (result) return result;
        }
        return undefined;
    }

    async function applyLoad(path: string): Promise<string | undefined> {
        for (const { filter, hook } of loads) {
            if (!filter.test(path)) continue;
            const result = await hook({ path }, context);
            if (result) return result.contents;
        }
        return undefined;
    }

    async function applyExtract(path: string, contents: string): Promise<ExtractResult | undefined> {
        for (const { filter, hook } of extracts) {
            if (!filter.test(path)) continue;
            const result = await hook({ path, contents }, context);
            if (result) return result;
        }
        return undefined;
    }

    while (queue.length) {
        // biome-ignore lint/style/noNonNullAssertion: queue is checked above
        const { path, importer } = queue.shift()!;
        const resolved = await applyResolve(path, importer);
        if (!resolved || visited.has(resolved)) continue;
        visited.add(resolved);

        const contents = await applyLoad(resolved);
        if (contents == null) continue;

        const extracted = await applyExtract(resolved, contents);
        if (!extracted) continue;

        messages.push(...extracted.messages);
        for (const imp of extracted.imports) {
            context.emitFile(imp, resolved);
        }
    }

    for (const hook of collects) {
        const result = await hook(messages, context);
        if (result) collected = result;
    }

    for (const hook of generates) {
        await hook({ locale, messages: collected }, context);
    }

    return messages;
}
