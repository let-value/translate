import { createRequire } from "node:module";
import { familySync, MUSL } from "detect-libc";

const require = createRequire(import.meta.url);
const packagePrefix = "@let-value/translate-extract-static";

export function getBinaryPackageSuffix(platform: string, arch: string, libc?: string | null): string | null {
    if (platform === "darwin" && (arch === "arm64" || arch === "x64")) {
        return `darwin-${arch}`;
    }

    if (platform === "linux" && (arch === "arm64" || arch === "x64")) {
        return `linux-${arch}-${libc === MUSL ? "musl" : "gnu"}`;
    }

    if (platform === "win32" && arch === "x64") {
        return "win32-x64";
    }

    return null;
}

export function getBinaryPackageName(platform: string, arch: string, libc?: string | null): string | null {
    const suffix = getBinaryPackageSuffix(platform, arch, libc);
    return suffix ? `${packagePrefix}-${suffix}` : null;
}

export function getBinaryName(platform: string, arch: string, libc?: string | null): string {
    const binaryPlatform = platform === "win32" ? "win" : platform;
    const libcSuffix = platform === "linux" && libc === MUSL ? "-musl" : "";
    const extension = platform === "win32" ? ".exe" : "";
    return `extract-${binaryPlatform}-${arch}${libcSuffix}${extension}`;
}

export function getBinaryPath(
    platform = process.platform,
    arch = process.arch,
    libc = platform === "linux" ? familySync() : null,
    resolvePackage: (name: string) => string = require.resolve,
): string | null {
    const packageName = getBinaryPackageName(platform, arch, libc);

    if (!packageName) {
        console.warn(`The static extractor does not support ${platform}-${arch}.`);
        return null;
    }

    try {
        return resolvePackage(packageName);
    } catch {
        console.warn(`Could not find ${packageName}. Reinstall @let-value/translate-extract-static.`);
        return null;
    }
}

export default getBinaryPath;
