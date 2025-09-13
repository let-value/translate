# translate

## Plugin API

`@let-value/translate-extract` exposes a small plugin system inspired by
esbuild. A plugin registers callbacks for the pipeline stages `onResolve`,
`onLoad`, and `onProcess`. Hooks operate on files grouped by a `namespace`
such as `"source"`, `"translate"`, or `"cleanup"`.

```ts
import type { Plugin } from "@let-value/translate-extract";

export function myPlugin(): Plugin {
    return {
        name: "my-plugin",
        setup(build) {
            build.onResolve({ filter: /.*/ }, ({ file }) => file);
            build.onLoad({ filter: /\.ts$/ }, async ({ file }) => {
                return await fs.promises.readFile(file, "utf8");
            });
            build.onProcess({ filter: /\.ts$/ }, ({ file, data }, api) => {
                // parse translations from `data`
                api.emit({ path: file.path, namespace: "translate", data: parseTranslations(data as string) });
            });
        },
    };
}
```

Hooks can emit additional files with `api.emit({ path, namespace, data })`,
wait for other namespaces with `await api.defer(namespace)`, and inspect prior
results through `api.graph`.
