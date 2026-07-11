# @let-value/graph

A minimal, general-purpose asynchronous DAG. It schedules computations, runs
independent nodes in parallel, and settles every node — it knows nothing about
what the nodes compute.

Two layers share one engine:

- the **scoped layer** (kinds, scopes, workers, wrappers) is what pipelines
  normally use — the machinery of phases, plugins, and interposition is
  handled by the library so consumers write plain business logic;
- the **core layer** (`add`/`connect`) is the raw engine underneath, still
  available for one-off nodes and custom wiring.

## Scoped layer

```ts
import { Graph } from "@let-value/graph";

const graph = new Graph();

// Kinds: typed node families.
const file = graph.kind<string>("file");
const translation = graph.kind<string>("translation");

// Plugins: a worker runs for every node of a kind, in that node's scope.
// Worker results form their own kind.
graph.each(file, "extract", (context, contents) => {
    for (const message of parse(contents)) {
        context.scope.add(translation, `${context.key}:${message}`, () => message);
    }
});

// Interposition: consumers of "file" transparently read the wrapped value.
// The wrapper controls whether the underlying computation runs at all, so a
// cache hit genuinely skips the work. Wrappers compose, last one outermost.
graph.wrap(file, "cache", async (context, next) => {
    return cache.get(context.key) ?? cache.put(context.key, await next());
});

// Scopes: hierarchical namespaces with automatic phase completion.
const scope = graph.scope("entryA.ts");

function walk(path: string) {
    scope.ensure(file, path, async () => {
        const contents = await read(path);
        for (const imported of importsOf(contents)) walk(imported); // dynamic emission
        return contents;
    });
}
walk("entryA.ts");

// completion(kind) fulfills once the scope is quiescent — every node in the
// scope subtree has settled, including dynamically created ones — and its
// value collects all `kind` values. No manual barrier wiring.
const bundle = graph.kind<string>("bundle");
scope.add(bundle, "po", {
    dependencies: [scope.completion(translation)],
    run: (context, translations) => serialize(translations),
});

await graph.run({ concurrency: 8 });
```

Semantics worth knowing:

- **Serial kinds** — `graph.kind(name, { serial: true })` never runs two
  nodes with the same key concurrently, even across scopes: they chain in
  creation order (e.g. writers of the same file). A failed node skips later
  same-key nodes like any dependency failure.

- **Completion / sealing** — `scope.completion(kind)` waits for all activity
  in the scope and its descendants, except nodes that depend on the
  completion itself (its consumers). After it fires the scope is sealed:
  adding a non-consumer node throws instead of silently missing the barrier.
- **Scope independence** — completions only wait on their own scope subtree,
  so one entry point can serialize while another is still being walked.
- **Registration order** — `each` and `wrap` must be registered before any
  node of the kind exists.
- **Dedup** — `scope.add` throws on duplicate keys; `scope.ensure` returns
  the existing node, which is what recursive walkers want.

## Core layer

- **Data dependencies** — `graph.add(id, { dependencies, run })`; values are
  passed to `run` as arguments, in order. Nodes can be added while the graph
  is running.
- **Ordering edges** — `graph.connect(dependency, dependent)` adds an edge
  without passing a value.
- **Failure isolation** — a rejected node skips its transitive dependents;
  unrelated branches keep running. `run()` rejects with an `AggregateError`
  of all node failures after everything has settled.
- **Cancellation** — pass an `AbortSignal` to `run()`. Pending nodes are
  skipped, running nodes receive the signal via their context, and `run()`
  rejects with the abort reason.
- **Cycle safety** — `add` and `connect` throw a `CycleError` rather than
  letting the graph deadlock.

Node handles expose `id`, `status` (`pending | running | fulfilled | rejected |
skipped`), `value`, and `error` for inspection at any point.
