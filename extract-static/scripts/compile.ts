import { resolve } from "node:path";
import { type Build, build } from "bun";
import { GLIBC, MUSL } from "detect-libc";
import { getBinaryName } from "../src/index.ts";

export const targets = [
    { platform: "win32", os: "windows", arch: "x64" } as const,
    { platform: "darwin", os: "darwin", arch: "x64" } as const,
    { platform: "darwin", os: "darwin", arch: "arm64" } as const,
    { platform: "linux", os: "linux", arch: "x64", libc: GLIBC } as const,
    { platform: "linux", os: "linux", arch: "arm64", libc: GLIBC } as const,
    { platform: "linux", os: "linux", arch: "x64", libc: MUSL } as const,
    { platform: "linux", os: "linux", arch: "arm64", libc: MUSL } as const,
];

const workspace = resolve(import.meta.dirname, "../..");
const entrypoint = resolve(workspace, "extract/bin/cli.ts");
const dist = resolve(workspace, "extract-static", "dist");

for (const { platform, os, arch, libc } of targets) {
    const target = `bun-${os}-${arch}${libc ? `-${libc}` : ""}` as Build.CompileTarget;
    const file = getBinaryName(platform, arch, libc);

    console.log("Building:", {
        target,
        file,
    });

    try {
        await build({
            entrypoints: [entrypoint],
            compile: {
                target,
                outfile: resolve(dist, file),
                windows: {
                    hideConsole: true,
                },
                autoloadDotenv: false,
                autoloadBunfig: false,
            },
        });
    } catch (error) {
        console.error(`Failed to build for target ${target}:`, error);
    }
}
