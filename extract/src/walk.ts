import fs from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

function findTsconfig(dir: string): string | undefined {
    let current = dir;
    // Walk up directories to find nearest tsconfig.json
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

/** Resolve a single import specifier relative to a file. */
export function resolveImport(file: string, spec: string): string | undefined {
    const dir = path.dirname(path.resolve(file));
    return resolveFromDir(dir, spec);
}

/**
 * Resolve a list of import specifiers relative to a file.
 *
 * @param file - Absolute or relative path to the importing file.
 * @param imports - Raw import specifiers collected from that file.
 * @returns Absolute paths to resolved modules.
 */
export function resolveImports(file: string, imports: string[]): string[] {
    const dir = path.dirname(path.resolve(file));
    const resolver = getResolver(dir);
    const resolved: string[] = [];
    for (const spec of imports) {
        const res = resolver.sync(dir, spec) as { path?: string };
        if (res.path) {
            resolved.push(res.path);
        }
    }
    return resolved;
}
