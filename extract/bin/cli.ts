#!/usr/bin/env node
import { cosmiconfig } from "cosmiconfig";
import type { ResolvedConfig } from "../src/configuration.ts";
import { run } from "../src/run.ts";

const moduleName = "translate";

async function main() {
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
        console.error("No configuration file found");
        process.exit(1);
    }

    const config = result.config as ResolvedConfig;
    const tasks: Promise<unknown>[] = [];
    for (const locale of config.locales) {
        for (const ep of config.entrypoints) {
            tasks.push(run(ep.entrypoint, { locale, config }));
        }
    }

    await Promise.all(tasks);
}

void main().catch((err) => {
    console.error(err);
    process.exit(1);
});
