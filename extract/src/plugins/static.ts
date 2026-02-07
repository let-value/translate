import type { Plugin, UniversalPlugin } from "../plugin.ts";

import { cleanup, core, po, react } from "./index.ts";

const original = {
    cleanup,
    core,
    po,
    react,
} as const;

export function resolveStaticPlugin(item: UniversalPlugin): Plugin {
    if ("static" in item) {
        return original[item.static.name](...item.static.props);
    }

    return item;
}
