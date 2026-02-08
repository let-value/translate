import { resolve } from "node:path";
import { type Build, build } from "bun";
import { MUSL } from "detect-libc";
import { arch, getBinaryName, libc, platform } from "../src/binary.ts";

const root = resolve(import.meta.dirname, "../../");
const os = platform === "win32" ? "windows" : platform;

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
    const target = `bun-${os}-${arch}${libc === MUSL ? `-${libc}` : ""}` as Build.CompileTarget;
    const file = getBinaryName(platform, arch, libc);

    console.log("Building:", {
        target,
        file,
    });

    const result = await build({
        entrypoints: [resolve(root, "extract-static/bin/launcher.ts")],
        plugins: [treeSitterPatch],
        compile: {
            target,
            outfile: resolve(root, "extract-static/prebuilts", file),
            windows: {
                hideConsole: true,
            },
            autoloadDotenv: false,
            autoloadBunfig: false,
            autoloadTsconfig: false,
            autoloadPackageJson: false,
        },
        minify: false,
    });

    if (!result.success) {
        throw new Error("Bun compile failed");
    }

    console.log(result);
}

await main();
