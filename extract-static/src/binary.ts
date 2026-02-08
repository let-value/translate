import { resolve } from "node:path";
import { familySync } from "detect-libc";

export const root = resolve(import.meta.dirname, "..");
export const platform = process.platform;
export const arch = process.arch;
export const libc = familySync() || null;

export function getBinaryName(platform: string, arch: string, libc?: string | null) {
    const extension = platform === "win32" ? ".exe" : "";

    return `extract-${platform}-${arch}${libc ? `-${libc}` : ""}${extension}`;
}

export const binaryName = getBinaryName(platform, arch, libc);
export const binaryPath = resolve(root, "prebuilts", binaryName);

export default binaryPath;
