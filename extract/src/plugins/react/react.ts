import type { Plugin } from "../../plugin.ts";
import type { Translation } from "../core/queries/types.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): Plugin<string, Translation[]> {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");
            build.onProcess({ filter, namespace: "source" }, ({ entrypoint, path, data }) => {
                const { translations, warnings } = parseSource(data, path);

                for (const warning of warnings) {
                    build.context.logger?.warn(`${warning.error} at ${warning.reference}`);
                }

                build.resolve({
                    entrypoint,
                    path,
                    namespace: "translate",
                    data: translations,
                });

                return undefined;
            });
        },
    };
}
