#!/usr/bin/env node

import { parseArgs } from "node:util";
import type { ResolvedConfig } from "../src/configuration.ts";
import { type LogLevel, logger } from "../src/logger.ts";
import { run } from "../src/run.ts";
import { createConfigExplorer, unwrapConfig } from "./config-loader.ts";

const defaultLogLevel: LogLevel = "info";

async function main() {
    const {
        values: { logLevel },
    } = parseArgs({
        args: process.argv.slice(2),
        options: {
            logLevel: { type: "string", short: "l" },
        },
    });

    const result = await createConfigExplorer().search();
    if (!result || !result.config) {
        logger.error("No configuration file found");
        process.exit(1);
    }

    const resolvedConfig = unwrapConfig(result.config);
    if (!resolvedConfig) {
        logger.error("Invalid configuration file");
        process.exit(1);
    }

    const effectiveLogLevel = (logLevel as LogLevel | undefined) ?? resolvedConfig.logLevel ?? defaultLogLevel;
    const config: ResolvedConfig = {
        ...resolvedConfig,
        logLevel: effectiveLogLevel,
    };
    logger.setLevel(effectiveLogLevel);

    for (const entrypoint of config.entrypoints) {
        await run(entrypoint, { config, logger });
    }
}

void main().catch((err) => {
    logger.error(err);
    process.exit(1);
});
