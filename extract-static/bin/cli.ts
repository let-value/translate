#!/usr/bin/env node
import { spawn } from "node:child_process";
import { binaryPath } from "../src/binary.ts";

const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: "inherit",
    windowsHide: true,
});

child.on("error", (error) => {
    console.error(error);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 1);
});
