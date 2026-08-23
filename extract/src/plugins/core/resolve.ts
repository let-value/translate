import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";
import type { ImportReference } from "../../plugin.ts";

export interface UnresolvedImport {
    spec: string;
    error?: string;
}

export interface ResolveImportsResult {
    resolved: Array<{ path: string; import: ImportReference }>;
    unresolved: UnresolvedImport[];
    /** Specifiers only a bundler plugin pipeline can resolve; skipped without a warning. */
    external: string[];
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
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

function isBuiltin(spec: string) {
    if (builtins.has(spec)) {
        return true;
    }

    const withoutNodePrefix = spec.startsWith("node:") ? spec.slice("node:".length) : spec;
    const [base, subpath] = withoutNodePrefix.split("/", 2);
    return subpath !== undefined && builtins.has(base);
}

// Two or more characters, so a Windows drive letter ("C:/app/main.ts") is not
// mistaken for a URI scheme.
const schemePattern = /^[a-z][a-z\d+\-.]+:/i;

/**
 * Specifiers that exist only inside a bundler's plugin pipeline — Vite virtual
 * modules (`virtual:pwa-register`), their resolved `\0` form, and URL schemes.
 * Extraction runs without that pipeline, so they can never resolve on disk and
 * reporting them as unresolved is noise.
 */
export function isExternal(spec: string) {
    return spec.startsWith("\0") || schemePattern.test(spec);
}

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
    if (isBuiltin(spec) || isExternal(spec)) {
        return undefined;
    }

    const dir = path.dirname(path.resolve(file));
    try {
        return resolveFromDir(dir, spec);
    } catch {
        return undefined;
    }
}

export function resolveImports(file: string, imports: Array<string | ImportReference>): string[] {
    return resolveImportResults(file, imports).resolved.map((result) => result.path);
}

function normalizeImportReference(imp: string | ImportReference): ImportReference {
    if (typeof imp === "string") {
        return { spec: imp, kind: "static", typeOnly: false };
    }
    return imp;
}

export function resolveImportResults(file: string, imports: Array<string | ImportReference>): ResolveImportsResult {
    const dir = path.dirname(path.resolve(file));
    const resolver = getResolver(dir);
    const resolved: Array<{ path: string; import: ImportReference }> = [];
    const unresolved: UnresolvedImport[] = [];
    const external: string[] = [];

    for (const imp of imports) {
        const ref = normalizeImportReference(imp);
        const { spec } = ref;
        if (isBuiltin(spec)) {
            continue;
        }
        if (isExternal(spec)) {
            external.push(spec);
            continue;
        }

        try {
            const res = resolver.sync(dir, spec) as { error?: string; path?: string };
            if (res.path) {
                resolved.push({ path: res.path, import: { ...ref, spec: res.path } });
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

    return { resolved, unresolved, external };
}
