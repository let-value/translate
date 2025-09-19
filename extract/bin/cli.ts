#!/usr/bin/env node
import { parseArgs } from "node:util";
import { cosmiconfig } from "cosmiconfig";
import type { ResolvedConfig } from "../src/configuration.ts";
import { type LogLevel, logger } from "../src/logger.ts";
import { run } from "../src/run.ts";

const moduleName = "translate";

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
    });

    const result = await explorer.search();
    if (!result || !result.config) {
        logger.error("No configuration file found");
        process.exit(1);
    }

    const config = result.config as ResolvedConfig;
    config.logLevel = (logLevel as LogLevel) ?? config.logLevel;
    logger.setLevel(config.logLevel);

    const tasks: Promise<unknown>[] = [];
    for (const entrypoint of config.entrypoints) {
        tasks.push(run(entrypoint, { config, logger }));
    }

    await Promise.all(tasks);
}

void main().catch((err) => {
    logger.error(err);
    process.exit(1);
});
