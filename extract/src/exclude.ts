import type { Exclude } from "./configuration.ts";
import type { ResolveArgs } from "./plugin.ts";

function normalizedPath(path: string) {
    return path.replace(/\\/g, "/");
}

function isInsideDirectory(path: string, directory: string) {
    return normalizedPath(path)
        .split("/")
        .some((part) => part === directory);
}

export const defaultExclude = {
    modules: ({ path }: ResolveArgs) => isInsideDirectory(path, "node_modules"),
    dist: ({ path }: ResolveArgs) => isInsideDirectory(path, "dist"),
    build: ({ path }: ResolveArgs) => isInsideDirectory(path, "build"),
    types: ({ import: imp }: ResolveArgs) => imp?.typeOnly ?? false,
} as const;

export type DefaultExclude = typeof defaultExclude;

export const defaultExcludes: Exclude[] = Object.values(defaultExclude);

export function isExcluded(args: ResolveArgs, exclude: Exclude[]) {
    return exclude.some((ex) => (typeof ex === "function" ? ex(args) : ex.test(args.path)));
}
