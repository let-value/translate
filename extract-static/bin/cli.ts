#!/usr/bin/env node
import { spawn } from "node:child_process";
import { getBinaryPath } from "../src/binary.ts";

const binaryPath = getBinaryPath();

if (binaryPath) {
    const child = spawn(binaryPath, process.argv.slice(2), {
        stdio: "inherit",
        windowsHide: true,
    });

    child.on("error", (error) => {
        console.warn(`Could not start the static extractor: ${String(error)}`);
        process.exitCode = 1;
    });

    child.on("exit", (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }

        process.exitCode = code ?? 1;
    });
} else {
    process.exitCode = 1;
}
