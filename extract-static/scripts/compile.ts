import { resolve } from "node:path";
import { type Build, build } from "bun";
import { MUSL } from "detect-libc";
import { arch, getBinaryName, libc, platform } from "../src/binary.ts";

const os = platform === "win32" ? "windows" : platform;

async function main() {
    const target = `bun-${os}-${arch}${libc === MUSL ? `-${libc}` : ""}` as Build.CompileTarget;
    const file = getBinaryName(platform, arch, libc);

    console.log("Building:", {
        target,
        file,
    });

    const result = await build({
        entrypoints: ["../dist/bin/launcher.js"],
        compile: {
            target,
            outfile: resolve("../dist", file),
            windows: {
                hideConsole: true,
            },
            autoloadDotenv: false,
            autoloadBunfig: false,
            autoloadTsconfig: false,
            autoloadPackageJson: false,
        },
        minify: false,
    });

    if (!result.success) {
        throw new Error("Bun compile failed");
    }
}

await main();
