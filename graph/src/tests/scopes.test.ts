import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "vite-plus/test";
import { CycleError, Graph, type GraphNode } from "../graph.ts";

test("completion collects kind values across the scope subtree", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    const parent = graph.scope("parent");
    const child = parent.scope("inner");

    parent.add(item, "a", () => 1);
    child.add(item, "b", () => 2);
    const all = parent.completion(item);
    const childOnly = child.completion(item);

    await graph.run();

    assert.deepEqual(all.value.toSorted(), [1, 2]);
    assert.deepEqual(childOnly.value, [2]);
});

test("worker results form a kind that can be awaited and collected", async () => {
    const graph = new Graph();
    const file = graph.kind<string>("file");
    const parsed = graph.each(file, "parse", (_context, value) => value.toUpperCase());

    const scope = graph.scope("entry");
    scope.add(file, "a", () => "a");
    scope.add(file, "b", () => "b");
    const done = scope.completion(parsed);

    await graph.run();

    assert.deepEqual(done.value.toSorted(), ["A", "B"]);
});

test("wrappers interpose on a kind: consumers read the cached value, cache hits skip the computation", async () => {
    const graph = new Graph();
    const contents = graph.kind<string>("contents");
    let parses = 0;
    const cache = new Map<string, string>();

    // The graph knows nothing about caching; the consumer registers the
    // read-through chain and every reader of "contents" sees cached values.
    graph.wrap(contents, "cache", async (context, next) => {
        const hit = cache.get(context.key);
        if (hit !== undefined) {
            return hit;
        }
        const value = await next();
        cache.set(context.key, value);
        return value;
    });

    cache.set("warm.ts", "cached contents of warm.ts");

    const scope = graph.scope("entry");
    const parse = (path: string) => () => {
        parses += 1;
        return `parsed contents of ${path}`;
    };
    const cold = scope.add(contents, "cold.ts", parse("cold.ts"));
    const warm = scope.add(contents, "warm.ts", parse("warm.ts"));

    const reads: string[] = [];
    graph.add("consumer-1", { dependencies: [warm], run: (_context, value) => reads.push(value) });
    graph.add("consumer-2", { dependencies: [warm], run: (_context, value) => reads.push(value) });

    await graph.run();

    assert.equal(parses, 1); // warm.ts was never parsed
    assert.equal(warm.value, "cached contents of warm.ts");
    assert.equal(cold.value, "parsed contents of cold.ts");
    assert.deepEqual(reads, ["cached contents of warm.ts", "cached contents of warm.ts"]);
    assert.equal(cache.get("cold.ts"), "parsed contents of cold.ts"); // miss populated the cache
    // The raw computation is a real lazy node: dormant on a hit, demanded on a miss.
    assert.equal(graph.get("entry/contents:warm.ts@raw")?.status, "skipped");
    assert.equal(graph.get("entry/contents:cold.ts@raw")?.status, "fulfilled");
});

test("wrappers compose with the last registered one outermost", async () => {
    const graph = new Graph();
    const word = graph.kind<string>("word");
    graph.wrap(word, "upper", async (_context, next) => (await next()).toUpperCase());
    graph.wrap(word, "exclaim", async (_context, next) => `${await next()}!`);

    const node = graph.scope("s").add(word, "a", () => "hey");

    await graph.run();

    assert.equal(node.value, "HEY!");
});

test("completion values see wrapped results", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    graph.wrap(item, "double", async (_context, next) => (await next()) * 2);

    const scope = graph.scope("s");
    scope.add(item, "a", () => 1);
    scope.add(item, "b", () => 2);
    const done = scope.completion(item);

    await graph.run();

    assert.deepEqual(done.value.toSorted(), [2, 4]);
});

test("adding to a scope after its completion fired fails loudly", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    const scope = graph.scope("s");
    scope.add(item, "one", () => 1);
    const done = scope.completion(item);

    graph.add("outsider", {
        dependencies: [done],
        run: () => {
            assert.throws(() => scope.add(item, "late", () => 2), /completion .* has already fired/);
        },
    });

    await graph.run();
});

test("consumers of a completion may be added to the scope after it fired", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    const report = graph.kind<number>("report");
    const scope = graph.scope("s");
    scope.add(item, "one", () => 1);
    const done = scope.completion(item);

    const late = graph.add("late-consumer", {
        dependencies: [done],
        run: () =>
            scope.add(report, "sum", {
                dependencies: [done],
                run: (_context, items) => items.reduce((sum, value) => sum + value, 0),
            }),
    });

    await graph.run();

    assert.equal(late.value.value, 1);
});

test("workers apply retroactively to earlier nodes; registration freezes at run()", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    const scope = graph.scope("s");
    scope.add(item, "x", () => 1);

    // Registered after the node exists: materialized when run() starts.
    const doubled = graph.each(item, "double", (_context, value) => value * 2);
    const done = scope.completion(doubled);

    const finished = graph.run();
    assert.throws(() => graph.each(item, "late", () => 0), /after run/);
    assert.throws(() => graph.wrap(item, "late", (_context, next) => next()), /after run/);
    await finished;

    assert.deepEqual(done.value, [2]);
});

test("scope.add rejects duplicate keys while ensure() reuses them", async () => {
    const graph = new Graph();
    const item = graph.kind<number>("item");
    const scope = graph.scope("s");
    const first = scope.add(item, "x", () => 1);

    assert.throws(() => scope.add(item, "x", () => 2), /already exists/);
    assert.equal(
        scope.ensure(item, "x", () => 3),
        first,
    );

    await graph.run();
    assert.equal(first.value, 1);
});

test("lazy nodes run only when demanded; undemanded ones settle skipped", async () => {
    const graph = new Graph();
    let ran = 0;
    const worker = (value: number) => () => {
        ran += 1;
        return value;
    };
    const wanted = graph.add("wanted", { lazy: true, run: worker(42) });
    const unwanted = graph.add("unwanted", { lazy: true, run: worker(0) });
    const consumer = graph.add("consumer", { run: (context) => context.demand(wanted) });

    await graph.run();

    assert.equal(ran, 1);
    assert.equal(consumer.value, 42);
    assert.equal(wanted.status, "fulfilled");
    assert.equal(unwanted.status, "skipped");
    assert.ok(graph.dependsOn(consumer, wanted)); // demand recorded a real edge
});

test("a static dependent wakes a lazy node", async () => {
    const graph = new Graph();
    const lazyNode = graph.add("lazy", { lazy: true, run: () => 7 });
    const consumer = graph.add("consumer", {
        dependencies: [lazyNode],
        run: (_context, value) => value + 1,
    });

    await graph.run();

    assert.equal(consumer.value, 8);
});

test("demanding a node that depends on the demander is a cycle", async () => {
    const graph = new Graph();
    let caught: unknown;
    const first = graph.add("first", {
        run: async (context) => {
            await delay(5);
            try {
                await context.demand(second);
            } catch (error) {
                caught = error;
            }
        },
    });
    const second: GraphNode<void> = graph.add("second", {
        dependencies: [first],
        run: () => undefined,
    });

    await graph.run();

    assert.ok(caught instanceof CycleError);
});

test("a suspended demander releases its concurrency slot", async () => {
    const graph = new Graph();
    const inner = graph.add("inner", { lazy: true, run: () => "value" });
    const outer = graph.add("outer", { run: (context) => context.demand(inner) });

    // With one slot, inner can only run if the suspended outer yields its slot.
    await graph.run({ concurrency: 1 });

    assert.equal(outer.value, "value");
});

test("kind names are unique per graph", () => {
    const graph = new Graph();
    graph.kind("item");
    assert.throws(() => graph.kind("item"), /already registered/);
    const other = graph.kind<string>("file");
    assert.throws(() => graph.each(other, "item", () => 0), /already registered/);
});
