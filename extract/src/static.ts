import type { cleanup as cleanupPlugin } from "./plugins/cleanup/cleanup.ts";
import type { core as corePlugin } from "./plugins/core/core.ts";
import type { po as poPlugin } from "./plugins/po/po.ts";
import type { react as reactPlugin } from "./plugins/react/react.ts";

export function core(...props: Parameters<typeof corePlugin>) {
    return {
        static: {
            name: "cleanup",
            props,
        },
    } as const;
}

export function react(...props: Parameters<typeof reactPlugin>) {
    return {
        static: {
            name: "react",
            props,
        },
    } as const;
}
export function po(...props: Parameters<typeof poPlugin>) {
    return {
        static: {
            name: "po",
            props,
        },
    } as const;
}

export function cleanup(...props: Parameters<typeof cleanupPlugin>) {
    return {
        static: {
            name: "cleanup",
            props,
        },
    } as const;
}

export type StaticPlugin =
    | ReturnType<typeof core>
    | ReturnType<typeof react>
    | ReturnType<typeof po>
    | ReturnType<typeof cleanup>;
