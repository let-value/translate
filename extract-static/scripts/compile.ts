import { resolve } from "node:path";
import { build } from "bun";
import { GLIBC, MUSL } from "detect-libc";
import { arch, getBinaryName, platform } from "../src/binary.ts";

const root = resolve(import.meta.dirname, "../../");

type CompileArch = "x64" | "arm64";
type CompileTarget =
    | `bun-darwin-${CompileArch}`
    | `bun-linux-${CompileArch}-glibc`
    | `bun-linux-${CompileArch}-musl`
    | "bun-windows-x64";

function getCompileArch(value: NodeJS.Architecture): CompileArch {
    if (value === "x64" || value === "arm64") {
        return value;
    }

    throw new Error(`Unsupported compile architecture: ${value}`);
}

function getCompileTarget(
    valuePlatform: NodeJS.Platform,
    valueArch: NodeJS.Architecture,
    valueLibc: string | null,
): CompileTarget {
    const compileArch = getCompileArch(valueArch);

    if (valuePlatform === "darwin") {
        return `bun-darwin-${compileArch}`;
    }

    if (valuePlatform === "linux") {
        if (valueLibc === MUSL) {
            return `bun-linux-${compileArch}-musl`;
        }

        return `bun-linux-${compileArch}-glibc`;
    }

    if (valuePlatform === "win32") {
        if (compileArch !== "x64") {
            throw new Error(`Unsupported Windows compile architecture: ${compileArch}`);
        }

        return "bun-windows-x64";
    }

    throw new Error(`Unsupported compile platform: ${valuePlatform}`);
}

const treeSitterPatch: import("bun").BunPlugin = {
    name: "tree-sitter-patch",
    setup(build) {
        build.onLoad({ filter: /tree-sitter[/\\]index\.js$/ }, async (args) => {
            const contents = await Bun.file(args.path).text();
            return {
                contents: contents
                    .replace(
                        "nodeSubclass.prototype.type = typeName;",
                        "Object.defineProperty(nodeSubclass.prototype, 'type', { value: typeName, writable: true, configurable: true });",
                    )
                    .replace(
                        "nodeSubclass.prototype.fields = Object.freeze(fieldNames.sort())",
                        "Object.defineProperty(nodeSubclass.prototype, 'fields', { value: Object.freeze(fieldNames.sort()), writable: true, configurable: true })",
                    ),
                loader: "js",
            };
        });
    },
};

async function main() {
    const libcs = platform === "linux" ? [GLIBC, MUSL] : [null];

    for (const libc of libcs) {
        const target = getCompileTarget(platform, arch, libc);
        const file = getBinaryName(platform, arch, libc);

        console.log("Building:", {
            target,
            file,
        });

        const compile = {
            target,
            outfile: resolve(root, "extract-static/prebuilts", file),
            windows: {
                hideConsole: true,
            },
            autoloadDotenv: false,
            autoloadBunfig: false,
            autoloadTsconfig: true,
            autoloadPackageJson: true,
        } satisfies Bun.CompileBuildOptions;

        const result = await build({
            entrypoints: [resolve(root, "extract-static/src/launcher.ts")],
            plugins: [treeSitterPatch],
            compile,
            minify: false,
        });

        if (!result.success) {
            throw new Error("Bun compile failed");
        }

        console.log(result);
    }
}

await main();
