import fs from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

export interface UnresolvedImport {
    spec: string;
    error?: string;
}

export interface ResolveImportsResult {
    resolved: string[];
    unresolved: UnresolvedImport[];
}

function findTsconfig(dir: string): string | undefined {
    let current = dir;
    while (true) {
        const config = path.join(current, "tsconfig.json");
        if (fs.existsSync(config)) {
            return config;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}

const resolverCache = new Map<string, ResolverFactory>();

function getResolver(dir: string) {
    const tsconfig = findTsconfig(dir);
    const key = tsconfig ?? "__default__";
    let resolver = resolverCache.get(key);
    if (!resolver) {
        resolver = new ResolverFactory({
            extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
            conditionNames: ["import", "require", "node"],
            ...(tsconfig ? { tsconfig: { configFile: tsconfig } } : {}),
        });
        resolverCache.set(key, resolver);
    }
    return resolver;
}

function resolveFromDir(dir: string, spec: string): string | undefined {
    const resolver = getResolver(dir);
    const res = resolver.sync(dir, spec) as { path?: string };
    return res.path;
}

export function resolveImport(file: string, spec: string): string | undefined {
    const dir = path.dirname(path.resolve(file));
    try {
        return resolveFromDir(dir, spec);
    } catch {
        return undefined;
    }
}

export function resolveImports(file: string, imports: string[]): string[] {
    return resolveImportResults(file, imports).resolved;
}

export function resolveImportResults(file: string, imports: string[]): ResolveImportsResult {
    const dir = path.dirname(path.resolve(file));
    const resolver = getResolver(dir);
    const resolved: string[] = [];
    const unresolved: UnresolvedImport[] = [];

    for (const spec of imports) {
        try {
            const res = resolver.sync(dir, spec) as { error?: string; path?: string };
            if (res.path) {
                resolved.push(res.path);
            } else {
                unresolved.push({ spec, error: res.error });
            }
        } catch (error) {
            unresolved.push({
                spec,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { resolved, unresolved };
}
