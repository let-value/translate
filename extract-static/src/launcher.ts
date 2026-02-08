import "fast-glob";
import "oxc-resolver";
import "@keqingmoe/tree-sitter";
import "tree-sitter-javascript";
import "tree-sitter-typescript";

import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { run } from "@let-value/translate-extract";
import type { ResolvedConfig } from "@let-value/translate-extract/core";
import { cosmiconfig, defaultLoaders, type LoaderResult } from "cosmiconfig";

const moduleName = "translate";
const absoluteUrlPattern = /^[a-zA-Z]+:\/\//;
const windowsAbsolutePathPattern = /^[a-zA-Z]:[\\/]/;
const logLevels = ["trace", "debug", "info", "warn", "error"] as const;
type LogLevel = (typeof logLevels)[number];
type Logger = {
    trace: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
};

function resolveSpecifier(specifier: string, fromFile: string): string {
    if (specifier.startsWith("node:") || specifier.startsWith("data:") || specifier.startsWith("file:")) {
        return specifier;
    }

    if (absoluteUrlPattern.test(specifier)) {
        return specifier;
    }

    if (specifier.startsWith("/") || windowsAbsolutePathPattern.test(specifier)) {
        return pathToFileURL(resolve(specifier)).href;
    }

    const resolvedPath = resolveModule(specifier, fromFile);
    if (resolvedPath.startsWith("node:")) {
        return resolvedPath;
    }

    return pathToFileURL(resolvedPath).href;
}

function resolveModule(specifier: string, fromFile: string): string {
    try {
        return Bun.resolveSync(specifier, fromFile);
    } catch {
        try {
            return Bun.resolveSync(specifier, dirname(fromFile));
        } catch {
            try {
                return resolveFromPackageRoot(specifier, fromFile);
            } catch {
                const requireFromFile = createRequire(pathToFileURL(fromFile).href);
                return requireFromFile.resolve(specifier);
            }
        }
    }
}

function splitPackageSpecifier(specifier: string): { packageName: string; subpath: string } {
    if (specifier.startsWith("@")) {
        const parts = specifier.split("/");
        if (parts.length < 2) {
            throw new Error(`Invalid package specifier: ${specifier}`);
        }

        const packageName = `${parts[0]}/${parts[1]}`;
        const subpath = parts.length > 2 ? `./${parts.slice(2).join("/")}` : ".";
        return { packageName, subpath };
    }

    const parts = specifier.split("/");
    const packageName = parts[0];
    const subpath = parts.length > 1 ? `./${parts.slice(1).join("/")}` : ".";
    return { packageName, subpath };
}

function findPackageRoot(packageName: string, fromFile: string): string | undefined {
    let current = dirname(resolve(fromFile));

    while (true) {
        const candidate = join(current, "node_modules", ...packageName.split("/"));
        if (existsSync(candidate)) {
            return candidate;
        }

        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }

        current = parent;
    }
}

function resolvePackageExportEntry(target: unknown): string | undefined {
    if (typeof target === "string") {
        return target;
    }

    if (Array.isArray(target)) {
        for (const item of target) {
            const resolved = resolvePackageExportEntry(item);
            if (resolved) {
                return resolved;
            }
        }
        return undefined;
    }

    if (!target || typeof target !== "object") {
        return undefined;
    }

    const record = target as Record<string, unknown>;
    return (
        resolvePackageExportEntry(record.import) ??
        resolvePackageExportEntry(record.require) ??
        resolvePackageExportEntry(record.default) ??
        resolvePackageExportEntry(record.node) ??
        resolvePackageExportEntry(record.bun)
    );
}

function tryResolveAsFile(basePath: string): string | undefined {
    const extensions = ["", ".mjs", ".js", ".cjs", ".json"];
    for (const extension of extensions) {
        const filePath = `${basePath}${extension}`;
        if (existsSync(filePath) && statSync(filePath).isFile()) {
            return filePath;
        }
    }

    if (existsSync(basePath) && statSync(basePath).isDirectory()) {
        for (const extension of [".mjs", ".js", ".cjs", ".json"]) {
            const indexPath = join(basePath, `index${extension}`);
            if (existsSync(indexPath) && statSync(indexPath).isFile()) {
                return indexPath;
            }
        }
    }

    return undefined;
}

function resolveFromPackageRoot(specifier: string, fromFile: string): string {
    const { packageName, subpath } = splitPackageSpecifier(specifier);
    const packageRoot = findPackageRoot(packageName, fromFile);
    if (!packageRoot) {
        throw new Error(`Cannot find module '${specifier}' from '${fromFile}'`);
    }

    const packageJsonPath = join(packageRoot, "package.json");
    const packageJson = existsSync(packageJsonPath)
        ? (JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
              exports?: unknown;
              main?: string;
              module?: string;
          })
        : {};

    const exportsField = packageJson.exports;
    if (exportsField) {
        if (typeof exportsField === "string" && subpath === ".") {
            const filePath = tryResolveAsFile(join(packageRoot, exportsField));
            if (filePath) {
                return filePath;
            }
        }

        if (typeof exportsField === "object" && !Array.isArray(exportsField)) {
            const exportsRecord = exportsField as Record<string, unknown>;
            const target = exportsRecord[subpath];
            const exportPath = resolvePackageExportEntry(target ?? (subpath === "." ? exportsRecord["."] : undefined));
            if (exportPath) {
                const filePath = tryResolveAsFile(isAbsolute(exportPath) ? exportPath : join(packageRoot, exportPath));
                if (filePath) {
                    return filePath;
                }
            }
        }
    }

    if (subpath !== ".") {
        const subpathFile = tryResolveAsFile(join(packageRoot, subpath.slice(2)));
        if (subpathFile) {
            return subpathFile;
        }
    }

    const entrypoint = packageJson.module ?? packageJson.main ?? "index.js";
    const entrypointFile = tryResolveAsFile(join(packageRoot, entrypoint));
    if (entrypointFile) {
        return entrypointFile;
    }

    throw new Error(`Cannot find module '${specifier}' from '${fromFile}'`);
}

function rewriteResolvedImports(content: string, fromFile: string): string {
    const rewrite = (specifier: string) => resolveSpecifier(specifier, fromFile);

    const importExportFromPattern = /((?:import|export)\s+(?:[^"'`]*?\s+from\s+)?)(["'])([^"']+)(\2)/g;
    const dynamicImportPattern = /(import\s*\(\s*)(["'])([^"']+)(\2\s*\))/g;
    const requireCallPattern = /(require\s*\(\s*)(["'])([^"']+)(\2\s*\))/g;

    return content
        .replace(
            importExportFromPattern,
            (_match, prefix: string, quote: string, specifier: string, suffix: string) => {
                return `${prefix}${quote}${rewrite(specifier)}${suffix}`;
            },
        )
        .replace(dynamicImportPattern, (_match, prefix: string, quote: string, specifier: string, suffix: string) => {
            return `${prefix}${quote}${rewrite(specifier)}${suffix}`;
        })
        .replace(requireCallPattern, (_match, prefix: string, quote: string, specifier: string, suffix: string) => {
            return `${prefix}${quote}${rewrite(specifier)}${suffix}`;
        });
}

async function loadModuleConfig(filepath: string, content: string): Promise<LoaderResult> {
    const ext = extname(filepath);
    const source = ext === ".ts" ? new Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync(content) : content;
    const rewritten = rewriteResolvedImports(source, filepath);

    try {
        const encodedSource = Buffer.from(rewritten, "utf8").toString("base64");
        const module = await import(`data:text/javascript;base64,${encodedSource}`);
        return module.default;
    } catch (error) {
        if (ext !== ".js") {
            throw error;
        }

        return defaultLoaders[".cjs"](filepath, content);
    }
}

function createLogger(level: LogLevel): Logger {
    const threshold = Math.max(logLevels.indexOf(level), 0);
    const canLog = (name: LogLevel) => logLevels.indexOf(name) >= threshold;

    return {
        trace(...args: unknown[]) {
            if (canLog("trace")) {
                console.debug(...args);
            }
        },
        debug(...args: unknown[]) {
            if (canLog("debug")) {
                console.debug(...args);
            }
        },
        info(...args: unknown[]) {
            if (canLog("info")) {
                console.info(...args);
            }
        },
        warn(...args: unknown[]) {
            if (canLog("warn")) {
                console.warn(...args);
            }
        },
        error(...args: unknown[]) {
            if (canLog("error")) {
                console.error(...args);
            }
        },
    };
}

async function main() {
    const {
        values: { logLevel },
    } = parseArgs({
        args: process.argv.slice(2),
        options: {
            logLevel: { type: "string", short: "l" },
        },
    });

    const explorer = cosmiconfig(moduleName, {
        searchPlaces: [
            `.${moduleName}rc.js`,
            `.${moduleName}rc.ts`,
            `.${moduleName}rc.mjs`,
            `.${moduleName}rc.cjs`,
            `.config/${moduleName}rc.js`,
            `.config/${moduleName}rc.ts`,
            `.config/${moduleName}rc.mjs`,
            `.config/${moduleName}rc.cjs`,
            `${moduleName}.config.js`,
            `${moduleName}.config.ts`,
            `${moduleName}.config.mjs`,
            `${moduleName}.config.cjs`,
        ],
        loaders: {
            ".mjs": loadModuleConfig,
            ".js": loadModuleConfig,
            ".ts": loadModuleConfig,
        },
    });

    const result = await explorer.search();
    if (!result || !result.config) {
        console.error("No configuration file found");
        process.exit(1);
    }

    const config = result.config as ResolvedConfig;
    config.logLevel = (logLevel as LogLevel) ?? config.logLevel;
    const runtimeLogger = createLogger(config.logLevel as LogLevel);

    const tasks: Promise<unknown>[] = [];
    for (const entrypoint of config.entrypoints) {
        tasks.push(run(entrypoint, { config, logger: runtimeLogger as never }));
    }

    await Promise.all(tasks);
}

void main().catch((err) => {
    console.error(err);
    process.exit(1);
});
