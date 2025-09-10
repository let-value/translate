#!/usr/bin/env node
import { cosmiconfig } from "cosmiconfig";
import type { ResolvedConfig } from "../src/configuration.ts";
import { run } from "../src/run.ts";

async function main() {
    const explorer = cosmiconfig("translate", {
        searchPlaces: [
            "translate.config.ts",
            "translate.config.js",
            "translate-extract.config.ts",
            "translate-extract.config.js",
        ],
    });

    const result = await explorer.search();
    if (!result || !result.config) {
        console.error("No configuration file found");
        process.exit(1);
    }

    const config = result.config as ResolvedConfig;
    const tasks: Promise<unknown>[] = [];
    for (const locale of config.locales) {
        for (const ep of config.entrypoints) {
            tasks.push(run(ep.entrypoint, config.plugins, locale, { config }));
        }
    }

    await Promise.all(tasks);
}

void main().catch((err) => {
    console.error(err);
    process.exit(1);
});
