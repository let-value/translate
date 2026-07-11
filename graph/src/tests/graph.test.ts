import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "vite-plus/test";
import { CycleError, Graph, type GraphNode } from "../graph.ts";

test("runs a single node and exposes its value", async () => {
    const graph = new Graph();
    const node = graph.add("answer", { run: () => 42 });

    await graph.run();

    assert.equal(node.status, "fulfilled");
    assert.equal(node.value, 42);
});

test("passes dependency values as run arguments, in order", async () => {
    const graph = new Graph();
    const left = graph.add("left", { run: () => "a" });
    const right = graph.add("right", { run: async () => "b" });
    const joined = graph.add("joined", {
        dependencies: [left, right],
        run: (_context, leftValue, rightValue) => leftValue + rightValue,
    });

    await graph.run();

    assert.equal(joined.value, "ab");
});

test("runs independent nodes in parallel", async () => {
    const graph = new Graph();
    let running = 0;
    let maxRunning = 0;
    const track = async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await delay(10);
        running -= 1;
    };
    graph.add("a", { run: track });
    graph.add("b", { run: track });
    graph.add("c", { run: track });

    await graph.run();

    assert.equal(maxRunning, 3);
});

test("respects the concurrency limit", async () => {
    const graph = new Graph();
    let running = 0;
    let maxRunning = 0;
    const track = async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await delay(5);
        running -= 1;
    };
    for (let index = 0; index < 6; index += 1) {
        graph.add(`node-${index}`, { run: track });
    }

    await graph.run({ concurrency: 2 });

    assert.equal(maxRunning, 2);
});

test("nodes can create new nodes while the graph is running", async () => {
    const graph = new Graph();
    const discovered: string[] = [];

    graph.add("discover", {
        run: () => {
            for (const file of ["a.ts", "b.ts"]) {
                graph.add(`file:${file}`, {
                    run: async () => {
                        discovered.push(file);
                        return file;
                    },
                });
            }
        },
    });

    await graph.run();

    assert.deepEqual(discovered.toSorted(), ["a.ts", "b.ts"]);
    assert.equal(graph.get("file:a.ts")?.value, "a.ts");
});

test("supports phase barriers over dynamically discovered nodes", async () => {
    // The pattern the extraction pipeline needs: a walk discovers file nodes
    // as it goes, and a serialization phase must wait for all of them —
    // including ones that did not exist when the barrier was declared.
    const graph = new Graph();
    const fileNodes: GraphNode<string>[] = [];
    const order: string[] = [];

    const walk = graph.add("walk", {
        run: () => {
            for (const file of ["a.ts", "b.ts", "c.ts"]) {
                const node = graph.add(`file:${file}`, {
                    run: async () => {
                        await delay(5);
                        order.push(file);
                        return `translations of ${file}`;
                    },
                });
                fileNodes.push(node);
                graph.connect(node, barrier);
            }
        },
    });

    const barrier = graph.add("serialize", {
        dependencies: [walk],
        run: () => {
            order.push("serialize");
            return fileNodes.map((node) => node.value);
        },
    });

    await graph.run();

    assert.deepEqual(order.at(-1), "serialize");
    assert.deepEqual(barrier.value, ["translations of a.ts", "translations of b.ts", "translations of c.ts"]);
});

test("a failed node skips its dependents but other branches still run", async () => {
    const graph = new Graph();
    const failure = new Error("boom");
    const failing = graph.add("failing", {
        run: () => {
            throw failure;
        },
    });
    const dependent = graph.add("dependent", { dependencies: [failing], run: () => "unreachable" });
    const independent = graph.add("independent", { run: () => "ok" });

    await assert.rejects(graph.run(), (error: unknown) => {
        assert.ok(error instanceof AggregateError);
        assert.deepEqual(error.errors, [failure]);
        return true;
    });

    assert.equal(failing.status, "rejected");
    assert.equal(failing.error, failure);
    assert.equal(dependent.status, "skipped");
    assert.equal(independent.status, "fulfilled");
    assert.equal(independent.value, "ok");
});

test("rejects cycles", async () => {
    const graph = new Graph();
    const first = graph.add("first", { run: () => 1 });
    const second = graph.add("second", { dependencies: [first], run: () => 2 });

    assert.throws(() => graph.connect(second, first), CycleError);
    assert.throws(() => graph.connect(first, first), CycleError);
});

test("rejects duplicate node ids", () => {
    const graph = new Graph();
    graph.add("node", { run: () => 1 });

    assert.throws(() => graph.add("node", { run: () => 2 }), /already exists/);
});

test("rejects connecting into a node that has already started", async () => {
    const graph = new Graph();
    const late = graph.add("late", { run: () => "late" });
    graph.add("early", {
        run: () => {
            assert.throws(() => graph.connect(late, early), /already started/);
        },
    });
    const early = graph.add("gate", { run: async () => delay(5) });

    // "gate" starts immediately alongside "early", so by the time "early"
    // tries to connect, the target is running.
    await graph.run();
});

test("aborting skips pending nodes and rejects with the abort reason", async () => {
    const graph = new Graph();
    const controller = new AbortController();
    const reason = new Error("stop");

    const first = graph.add("first", {
        run: async () => {
            controller.abort(reason);
            return "done";
        },
    });
    const dependent = graph.add("dependent", { dependencies: [first], run: () => "unreachable" });

    await assert.rejects(graph.run({ signal: controller.signal }), (error: unknown) => error === reason);

    assert.equal(first.status, "fulfilled");
    assert.equal(dependent.status, "skipped");
});

test("run functions receive the abort signal for cooperative cancellation", async () => {
    const graph = new Graph();
    const controller = new AbortController();
    let observedAbort = false;

    graph.add("long", {
        run: async (context) => {
            controller.abort("stop");
            observedAbort = context.signal.aborted;
        },
    });

    await assert.rejects(graph.run({ signal: controller.signal }));
    assert.ok(observedAbort);
});

test("value throws until the node has fulfilled", async () => {
    const graph = new Graph();
    const node = graph.add("node", { run: () => "ready" });

    assert.throws(() => node.value, /has no value/);
    await graph.run();
    assert.equal(node.value, "ready");
});

test("run can only be called once", async () => {
    const graph = new Graph();
    graph.add("node", { run: () => 1 });

    await graph.run();
    await assert.rejects(graph.run(), /already running or has finished/);
});
