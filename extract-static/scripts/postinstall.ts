import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { binaryName, binaryPath, platform } from "../src/binary.ts";

const root = resolve(import.meta.dirname, "../..");
const dist = resolve(root, "dist");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string };

const repo = "https://github.com/let-value/translate";
const tag = `v${pkg.version}`;
const url = `${repo}/releases/download/${tag}/${binaryName}`;

async function downloadBinary() {
    try {
        const response = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(30000),
            headers: {
                "user-agent": "@let-value/translate-extract-static postinstall",
            },
        });

        writeFileSync(binaryPath, Buffer.from(await response.arrayBuffer()));

        if (platform !== "win32") {
            chmodSync(binaryPath, 0o755);
        }
        return true;
    } catch {}
}

async function main(): Promise<void> {
    mkdirSync(dist, { recursive: true });
    if (existsSync(binaryPath)) {
        return;
    }

    if (await downloadBinary()) {
        console.log(`Downloaded binary: ${binaryName}`);
        return;
    }

    console.warn(`Could not download a binary for ${binaryName}.`);
}

main().catch((error: unknown) => {
    console.warn(`Binary download failed: ${String(error)}`);
});
