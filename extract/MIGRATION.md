# Migrating extractor plugins

## 1.2 — the pipeline became a graph

The extractor used to drive plugins with a task queue: hooks were keyed by
`namespace`, moved work along by calling `build.resolve` / `build.load` /
`build.process` themselves, and waited for a phase to drain with
`build.defer(namespace)`. Ordering was whatever the queue happened to do, and
"has everything been extracted yet?" was a counter each plugin had to latch on
its own.

That is now a dependency graph ([`@let-value/graph`](../graph/README.md)). The
extractor owns the ordering, so a plugin only says _what_ it contributes and
_when_ in the pipeline, never _when to run next_.

### Removed

| Removed                                | Replacement                                                        |
| -------------------------------------- | ------------------------------------------------------------------ |
| `build.onResolve(filter, hook)`        | none — resolution is not a plugin phase any more                   |
| `build.resolve(args)`                  | `build.source({ entrypoint, path, import })`                       |
| `build.load(args)` / `build.process()` | none — the extractor advances the pipeline itself                  |
| `build.defer(namespace)`               | `build.onCollected` (per entrypoint) / `build.onOutputs` (per run) |
| `Plugin<TInput, TOutput>` generics     | `Plugin` — hooks carry their own types                             |
| `Filter` (`{ filter, namespace }`)     | a bare `RegExp` matched against the file path                      |

`namespace` is gone entirely. Hooks match on the path, and the phase a hook
belongs to is the hook you register.

### The hooks

```ts
build.onLoad(/\.tsx?$/, ({ entrypoint, path }) => contents);
build.onProcess(/\.tsx?$/, ({ entrypoint, path, contents, emit }) => {
    emit(translations); // stop later processors for this file by returning non-undefined
});
build.onCollected(({ entrypoint, files, output }) => {
    output(destination, async () => {
        /* write it */
    });
});
build.onOutputs(({ outputs }) => {
    /* every path written in this run */
});
```

- `onLoad` returns the file's contents, or `undefined` to let the next loader
  try. Replaces an `onLoad` that had to rebuild and return the whole args
  object.
- `onProcess` reports translations through `emit()` instead of
  `build.resolve({ namespace: "translate", data })`. Returning a non-`undefined`
  value stops later processors for that file, as before.
- `onCollected` runs once per entrypoint, after every source file of that
  entrypoint has been processed — this is what `build.defer("source")` was for.
  It receives one entry per processed file and schedules artifacts with
  `output(path, produce)`.
- `onOutputs` runs once per run, after every entrypoint produced its outputs —
  this is what `build.defer("translate")` was for. It receives every path
  written in the run, across all entrypoints.

### Ordering guarantees you can rely on

- Writes to the same path are serialized into a single writer, so two plugins
  targeting one file no longer race.
- Every `onCollected` hook has run before any `output()` producer does, so a
  producer may read state its hook accumulated across entrypoints.
- A failing entrypoint produces no output, and does not stop other entrypoints
  from producing theirs. The run rejects at the end with an `AggregateError`
  holding every failure.

### Before / after

```ts
// Before
build.onResolve({ filter, namespace: "source" }, ({ entrypoint, path, import: imp, data }) => ({
    entrypoint,
    namespace: "source",
    path: resolve(path),
    import: imp,
    data,
}));
build.onLoad({ filter, namespace: "source" }, async ({ entrypoint, path }) => ({
    entrypoint,
    path,
    namespace: "source",
    data: await readFile(path, "utf8"),
}));
build.onProcess({ filter, namespace: "source" }, ({ entrypoint, path, data }) => {
    const { translations } = parseSource(data, path);
    build.resolve({ entrypoint, path, namespace: "translate", data: translations });
    return undefined;
});

// After
build.onLoad(filter, ({ path }) => readFile(path, "utf8"));
build.onProcess(filter, ({ path, contents, emit }) => {
    emit(parseSource(contents, path).translations);
    return undefined;
});
```

Plugins that latched on `build.defer(...)` to run "once everything is done" can
drop the latch — `onCollected` and `onOutputs` already fire exactly once, at the
right point. See `src/plugins/po/po.ts` and `src/plugins/cleanup/cleanup.ts` for
worked examples of both.
