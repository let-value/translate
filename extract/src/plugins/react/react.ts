import type { Plugin } from "../../plugin.ts";
import { parseSource } from "./parse.ts";

const filter = /\.[cm]?[jt]sx$/;

export function react(): Plugin {
    return {
        name: "react",
        setup(build) {
            build.context.logger?.debug("react plugin initialized");

            // A file reached from several entrypoints is processed once per
            // entrypoint; its warnings are about the file, not the walk.
            const reported = new Set<string>();

            build.onProcess(filter, ({ path, contents, emit }) => {
                const { translations, warnings } = parseSource(contents, path);

                for (const warning of warnings) {
                    const message = `${warning.error} at ${warning.reference}`;
                    if (reported.has(message)) {
                        continue;
                    }
                    reported.add(message);
                    build.context.logger?.warn(message);
                }

                emit(translations);
                return undefined;
            });
        },
    };
}
