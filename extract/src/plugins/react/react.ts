import type { Plugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): Plugin {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");

            build.onProcess(filter, ({ path, contents, emit }) => {
                const { translations, warnings } = parseSource(contents, path);

                for (const warning of warnings) {
                    build.context.logger?.warn(`${warning.error} at ${warning.reference}`);
                }

                emit(translations);
                return undefined;
            });
        },
    };
}
