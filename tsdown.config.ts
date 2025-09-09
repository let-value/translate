import type { UserConfig } from "tsdown";

export const base: UserConfig = {
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist",
    clean: true,
};
