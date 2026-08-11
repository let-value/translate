import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { Graph, type GraphNode, type Scope } from "../graph.ts";

// Simulates the shape of the translation extraction pipeline using the
// scoped API, so consumers stay lean business logic:
// - a fake file tree is walked recursively, emitting file nodes as imports
//   are discovered;
// - plugins register workers with graph.each() and they attach to every
//   file node automatically;
// - workers emit nodes of a different kind (translations);
// - scope.completion(kind) awaits a whole dynamically-growing phase without
//   any manual barrier wiring;
// - scopes are independent: an entry point serializes as soon as its own
//   files are done, without waiting for other entry points.
test("extraction-like pipeline: dynamic walk, plugin workers, per-scope phase completion", async () => {
    const files: Record<string, { imports: string[]; strings: string[] }> = {
        "entryA.ts": { imports: ["a1.ts", "shared.ts"], strings: ["hello"] },
        "a1.ts": { imports: ["shared.ts"], strings: ["foo"] },
        "shared.ts": { imports: [], strings: ["common"] },
        "entryB.ts": { imports: ["b1.ts"], strings: ["world"] },
        "b1.ts": { imports: [], strings: ["bar"] },
    };

    const graph = new Graph();
    const log: string[] = [];

    // Entry B's deep walk is held back until entry A has serialized. If
    // scopes leaked (a completion waiting on all entry points instead of its
    // own), A's serialization would wait on B's walk and the test would
    // deadlock instead of passing.
    let releaseB!: () => void;
    const bGate = new Promise<void>((resolve) => {
        releaseB = resolve;
    });

    const file = graph.kind<string>("file");
    const translation = graph.kind<string>("translation");
    const bundle = graph.kind<string[]>("bundle");

    // Plugin 1: extracts strings from every walked file, emitting nodes of a
    // different kind than the one the worker attached to.
    graph.each(file, "extract", (context) => {
        for (const string of files[context.key].strings) {
            context.scope.add(translation, `${context.key}:${string}`, () => `${string}#${context.key}`);
        }
    });

    // Plugin 2: an independent pass over the same files, consuming the file
    // node's value.
    graph.each(file, "lint", (context, contents) => {
        log.push(`lint:${context.scope.name}:${contents}`);
    });

    function walk(scope: Scope, path: string): void {
        scope.ensure(file, path, async () => {
            if (scope.name === "entryB.ts" && path === "b1.ts") {
                await bGate;
            }
            log.push(`walked:${scope.name}:${path}`);
            for (const imported of files[path].imports) {
                walk(scope, imported);
            }
            return `contents of ${path}`;
        });
    }

    const serialized: Record<string, GraphNode<string[]>> = {};
    for (const entry of ["entryA.ts", "entryB.ts"]) {
        const scope = graph.scope(entry);
        walk(scope, entry);
        serialized[entry] = scope.add(bundle, entry, {
            dependencies: [scope.completion(translation)],
            run: (context, translations) => {
                log.push(`serialize:${context.scope.name}`);
                return translations.toSorted();
            },
        });
    }

    graph.add("release-b", { dependencies: [serialized["entryA.ts"]], run: () => releaseB() });

    await graph.run();

    // Every scope collected exactly the translations reachable from its own
    // entry point, including dynamically discovered and shared files.
    assert.deepEqual(serialized["entryA.ts"].value, ["common#shared.ts", "foo#a1.ts", "hello#entryA.ts"]);
    assert.deepEqual(serialized["entryB.ts"].value, ["bar#b1.ts", "world#entryB.ts"]);

    // Both plugin workers ran per file: 3 files in scope A, 2 in scope B.
    assert.equal(log.filter((entry) => entry.startsWith("lint:entryA.ts:")).length, 3);
    assert.equal(log.filter((entry) => entry.startsWith("lint:entryB.ts:")).length, 2);

    // Scope independence: entry A serialized while entry B was still walking.
    assert.ok(log.indexOf("serialize:entryA.ts") < log.indexOf("walked:entryB.ts:b1.ts"));
});
