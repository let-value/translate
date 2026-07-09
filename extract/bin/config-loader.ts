import { pathToFileURL } from "node:url";
import { lilconfig, type Loader } from "lilconfig";
import type { ResolvedConfig } from "../src/configuration.ts";

export const moduleName = "translate";

type ConfigExport =
    | ResolvedConfig
    | { default: ResolvedConfig | undefined }
    | { translateConfig: ResolvedConfig | undefined }
    | undefined;

const configModuleLoader: Loader = async (filepath) => {
    const configModule = await import(pathToFileURL(filepath).href);

    return configModule.default ?? configModule;
};

export function unwrapConfig(config: ConfigExport) {
    if (config && typeof config === "object" && "default" in config) {
        return config.default;
    }

    if (config && typeof config === "object" && "translateConfig" in config) {
        return config.translateConfig;
    }

    return config;
}

export function createConfigExplorer() {
    return lilconfig(moduleName, {
        loaders: {
            ".js": configModuleLoader,
            ".ts": configModuleLoader,
            ".mjs": configModuleLoader,
            ".cjs": configModuleLoader,
        },
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
}
