export type NodeId = string;

export type NodeStatus = "pending" | "running" | "fulfilled" | "rejected" | "skipped";

export interface NodeContext {
    readonly id: NodeId;
    readonly signal: AbortSignal;
    /**
     * Dynamic dependency: awaits another node's value, recording a real
     * dependency edge. Demanding a lazy node schedules it; a suspended
     * demander releases its concurrency slot. Rejects with the target's
     * error (or SkippedError), and throws CycleError if the target already
     * depends on the demander.
     */
    demand<T>(node: GraphNode<T>): Promise<T>;
}

export interface GraphNode<T = unknown> {
    readonly id: NodeId;
    readonly status: NodeStatus;
    /** Result of the node. Throws if the node has not fulfilled. */
    readonly value: T;
    /** Rejection reason when status is "rejected", otherwise undefined. */
    readonly error: unknown;
}

export type NodeValues<TDeps extends readonly GraphNode[]> = {
    [K in keyof TDeps]: TDeps[K] extends GraphNode<infer R> ? R : never;
};

export interface NodeOptions<TDeps extends readonly GraphNode[], TResult> {
    /**
     * Data dependencies: the node runs after all of them fulfill and
     * receives their values as arguments, in order.
     */
    dependencies?: TDeps;
    /**
     * Lazy nodes stay dormant until demanded — via context.demand() or by a
     * non-lazy node depending on them. A lazy node that is never demanded is
     * skipped when the graph finishes (demand-driven evaluation).
     */
    lazy?: boolean;
    run: (context: NodeContext, ...dependencies: NodeValues<TDeps>) => TResult | PromiseLike<TResult>;
}

export interface RunOptions {
    /** Maximum number of nodes running at the same time. Defaults to unlimited. */
    concurrency?: number;
    signal?: AbortSignal;
}

export class CycleError extends Error {
    constructor(dependency: NodeId, dependent: NodeId) {
        super(`Adding edge "${dependency}" -> "${dependent}" would create a cycle`);
        this.name = "CycleError";
    }
}

export class SkippedError extends Error {
    constructor(id: NodeId) {
        super(`Node "${id}" was skipped because a dependency failed or the run was aborted`);
        this.name = "SkippedError";
    }
}

class NodeState<T = unknown> implements GraphNode<T> {
    readonly id: NodeId;
    status: NodeStatus = "pending";
    result: T | undefined;
    reason: unknown;
    lazy = false;
    /** Resumers of demanders suspended on this node, flushed on settle. */
    waiters: (() => void)[] | undefined;
    /** Ordered data dependencies, passed as run arguments. */
    readonly arguments_: readonly NodeState[];
    /** All dependencies, including ordering-only edges added via connect(). */
    readonly dependencies = new Set<NodeState>();
    readonly dependents = new Set<NodeState>();
    readonly execute: (context: NodeContext, ...values: never[]) => unknown;

    constructor(id: NodeId, arguments_: readonly NodeState[], execute: NodeState["execute"]) {
        this.id = id;
        this.arguments_ = arguments_;
        this.execute = execute;
        for (const dependency of arguments_) {
            this.dependencies.add(dependency);
        }
    }

    get value(): T {
        if (this.status !== "fulfilled") {
            throw new Error(`Node "${this.id}" has no value (status: ${this.status})`);
        }
        return this.result as T;
    }

    get error(): unknown {
        return this.reason;
    }
}

/**
 * A dynamic, asynchronous DAG of computations.
 *
 * Nodes can be added before or during a run, so a running node can discover
 * and schedule new work. Edges added with {@link Graph.connect} impose
 * ordering without contributing run arguments, which lets consumers build
 * barriers: a node that only starts once a dynamically growing set of
 * predecessors has finished.
 */
export class Graph {
    #nodes = new Map<NodeId, NodeState>();
    #root: Scope;
    #pending = new Set<NodeState>();
    #dormant = new Set<NodeState>();
    #runningCount = 0;
    #suspendedCount = 0;
    #concurrency = Infinity;
    #controller: AbortController | undefined;
    #finish: { resolve: () => void; reject: (reason: unknown) => void } | undefined;
    #started = false;
    #finished = false;
    #errors: unknown[] = [];

    constructor() {
        INTERNALS.set(this, {
            kinds: new Map(),
            workers: new Map(),
            wrappers: new Map(),
            frozen: false,
        });
        this.#root = new Scope(this, undefined, "");
    }

    /** The root scope. Nodes added here belong to no named scope. */
    get root(): Scope {
        return this.#root;
    }

    /** Creates or returns a named child scope of the root scope. */
    scope(name: string): Scope {
        return this.#root.scope(name);
    }

    /** Declares a typed node kind. Kind names are unique per graph. */
    kind<T>(name: string): Kind<T> {
        const internals = INTERNALS.get(this) as Internals;
        if (internals.kinds.has(name)) {
            throw new Error(`Kind "${name}" is already registered`);
        }
        const kind: Kind<T> = { name };
        internals.kinds.set(name, kind);
        return kind;
    }

    /**
     * Registers a worker that runs for every node of `source`, in the same
     * scope as that node. Worker results form their own kind, so they can be
     * awaited and collected with scope.completion(). Part of the graph's
     * definition: allowed until run() starts, and applies to nodes added
     * before the registration as well.
     */
    each<TSource, TResult>(source: Kind<TSource>, name: string, worker: NodeWorker<TSource, TResult>): Kind<TResult> {
        const internals = INTERNALS.get(this) as Internals;
        if (internals.frozen) {
            throw new Error(`Cannot register worker "${name}" after run() started`);
        }
        const kind = this.kind<TResult>(name);
        const registrations = internals.workers.get(source.name) ?? [];
        registrations.push({ kind, worker: worker as unknown as NodeWorker<unknown, unknown> });
        internals.workers.set(source.name, registrations);
        return kind;
    }

    /**
     * Interposes on every node of a kind: consumers of the node receive the
     * outermost wrapper's value instead of the raw computation. The chain is
     * materialized as real intermediate nodes ("<id>@raw", "<id>@<name>"),
     * evaluated on demand: a wrapper that never calls next() (e.g. a cache
     * hit) keeps the inner nodes from running at all. Wrappers compose; the
     * last registered one is outermost. Part of the graph's definition:
     * allowed until run() starts.
     */
    wrap<T>(kind: Kind<T>, name: string, wrapper: NodeWrapper<T>): void {
        const internals = INTERNALS.get(this) as Internals;
        if (internals.frozen) {
            throw new Error(`Cannot register wrapper "${name}" after run() started`);
        }
        const registrations = internals.wrappers.get(kind.name) ?? [];
        registrations.push({ name, wrap: wrapper as unknown as NodeWrapper<unknown> });
        internals.wrappers.set(kind.name, registrations);
    }

    /** Whether `node` transitively depends on `dependency`. */
    dependsOn(node: GraphNode, dependency: GraphNode): boolean {
        const target = this.#resolve(dependency);
        const stack = [...this.#resolve(node).dependencies];
        const seen = new Set<NodeState>();
        while (stack.length > 0) {
            const current = stack.pop() as NodeState;
            if (current === target) {
                return true;
            }
            if (seen.has(current)) {
                continue;
            }
            seen.add(current);
            stack.push(...current.dependencies);
        }
        return false;
    }

    add<TResult, const TDeps extends readonly GraphNode[] = readonly []>(
        id: NodeId,
        options: NodeOptions<TDeps, TResult>,
    ): GraphNode<TResult> {
        if (this.#finished) {
            throw new Error(`Cannot add node "${id}": the graph has already finished`);
        }
        if (this.#nodes.has(id)) {
            throw new Error(`Node "${id}" already exists`);
        }

        const dependencies = (options.dependencies ?? []).map((dependency) => this.#resolve(dependency));
        const node = new NodeState(id, dependencies, options.run as NodeState["execute"]);
        node.lazy = options.lazy ?? false;
        for (const dependency of dependencies) {
            dependency.dependents.add(node);
        }
        this.#nodes.set(id, node);
        if (node.lazy) {
            this.#dormant.add(node);
        } else {
            this.#pending.add(node);
            for (const dependency of dependencies) {
                this.#wake(dependency);
            }
        }
        if (this.#started) {
            queueMicrotask(() => this.#pump());
        }
        return node as GraphNode<TResult>;
    }

    /**
     * Adds an ordering-only edge: `dependent` will not start until
     * `dependency` has fulfilled. The dependency's value is not passed to the
     * dependent's run function; read it from the node handle if needed.
     */
    connect(dependency: GraphNode, dependent: GraphNode): void {
        const from = this.#resolve(dependency);
        const to = this.#resolve(dependent);
        if (to.status !== "pending") {
            throw new Error(`Cannot add dependency to node "${to.id}": it has already started`);
        }
        if (from === to || this.#reaches(to, from)) {
            throw new CycleError(from.id, to.id);
        }
        to.dependencies.add(from);
        from.dependents.add(to);
        if (!this.#dormant.has(to)) {
            this.#wake(from);
        }
        if (this.#started) {
            queueMicrotask(() => this.#pump());
        }
    }

    get(id: NodeId): GraphNode | undefined {
        return this.#nodes.get(id);
    }

    get nodes(): ReadonlyMap<NodeId, GraphNode> {
        return this.#nodes;
    }

    /**
     * Runs the graph until every node has settled, including nodes added
     * while running. Rejects with an AggregateError if any node rejected, or
     * with the abort reason if the signal aborted. Can only be called once.
     */
    async run(options: RunOptions = {}): Promise<void> {
        if (this.#started) {
            throw new Error("Graph is already running or has finished");
        }
        // End of the definition phase: attach workers to nodes added before
        // their registration, then freeze registrations.
        Scope.materialize(this.#root);
        (INTERNALS.get(this) as Internals).frozen = true;
        this.#started = true;
        this.#concurrency = options.concurrency ?? Infinity;
        if (this.#concurrency < 1) {
            throw new Error("concurrency must be at least 1");
        }
        this.#controller = new AbortController();
        const signal = options.signal;
        if (signal) {
            if (signal.aborted) {
                this.#controller.abort(signal.reason);
            } else {
                signal.addEventListener("abort", () => {
                    this.#controller?.abort(signal.reason);
                    this.#pump();
                });
            }
        }

        return new Promise<void>((resolve, reject) => {
            this.#finish = { resolve, reject };
            this.#pump();
        });
    }

    #resolve(handle: GraphNode): NodeState {
        const node = this.#nodes.get(handle.id);
        if (!node || node !== handle) {
            throw new Error(`Node "${handle.id}" does not belong to this graph`);
        }
        return node;
    }

    #reaches(from: NodeState, target: NodeState): boolean {
        const stack = [...from.dependents];
        const seen = new Set<NodeState>();
        while (stack.length > 0) {
            const node = stack.pop() as NodeState;
            if (node === target) {
                return true;
            }
            if (seen.has(node)) {
                continue;
            }
            seen.add(node);
            stack.push(...node.dependents);
        }
        return false;
    }

    #pump(): void {
        if (!this.#started || this.#finished || !this.#finish) {
            return;
        }
        let progressed = true;
        while (progressed) {
            progressed = false;
            for (const node of [...this.#pending]) {
                if (this.#controller?.signal.aborted) {
                    this.#settle(node, "skipped", undefined, new SkippedError(node.id));
                    progressed = true;
                    continue;
                }
                let ready = true;
                let doomed = false;
                for (const dependency of node.dependencies) {
                    if (dependency.status === "rejected" || dependency.status === "skipped") {
                        doomed = true;
                        break;
                    }
                    if (dependency.status !== "fulfilled") {
                        ready = false;
                    }
                }
                if (doomed) {
                    this.#settle(node, "skipped", undefined, new SkippedError(node.id));
                    progressed = true;
                } else if (ready && this.#runningCount < this.#concurrency) {
                    this.#start(node);
                }
            }
        }
        if (this.#pending.size === 0 && this.#runningCount === 0 && this.#suspendedCount === 0) {
            this.#complete();
        }
    }

    /** Moves a dormant lazy node (and its dormant dependencies) into scheduling. */
    #wake(node: NodeState): void {
        if (!this.#dormant.delete(node)) {
            return;
        }
        this.#pending.add(node);
        for (const dependency of node.dependencies) {
            this.#wake(dependency);
        }
    }

    async #demand<T>(demander: NodeState, handle: GraphNode<T>): Promise<T> {
        const target = this.#resolve(handle);
        if (target === demander || this.#reaches(demander, target)) {
            throw new CycleError(target.id, demander.id);
        }
        demander.dependencies.add(target);
        target.dependents.add(demander);
        this.#wake(target);
        if (target.status === "pending" || target.status === "running") {
            this.#pump();
        }
        if (target.status === "pending" || target.status === "running") {
            // Suspend without holding a concurrency slot; the suspended
            // demander still counts as live work.
            this.#runningCount -= 1;
            this.#suspendedCount += 1;
            this.#pump();
            await new Promise<void>((resume) => {
                (target.waiters ??= []).push(resume);
            });
            this.#suspendedCount -= 1;
            this.#runningCount += 1;
        }
        if (target.status === "fulfilled") {
            return target.result as T;
        }
        if (target.status === "rejected") {
            throw target.reason;
        }
        throw new SkippedError(target.id);
    }

    #start(node: NodeState): void {
        this.#pending.delete(node);
        node.status = "running";
        this.#runningCount += 1;
        const context: NodeContext = {
            id: node.id,
            signal: this.#controller?.signal as AbortSignal,
            demand: (handle) => this.#demand(node, handle),
        };
        const values = node.arguments_.map((dependency) => dependency.value) as never[];
        Promise.resolve()
            .then(() => node.execute(context, ...values))
            .then(
                (value) => {
                    this.#runningCount -= 1;
                    this.#settle(node, "fulfilled", value, undefined);
                    this.#pump();
                },
                (reason: unknown) => {
                    this.#runningCount -= 1;
                    this.#errors.push(reason);
                    this.#settle(node, "rejected", undefined, reason);
                    this.#pump();
                },
            );
    }

    #settle(node: NodeState, status: NodeStatus, value: unknown, reason: unknown): void {
        this.#pending.delete(node);
        node.status = status;
        node.result = value;
        node.reason = reason;
        const waiters = node.waiters;
        node.waiters = undefined;
        waiters?.forEach((resume) => resume());
    }

    #complete(): void {
        const finish = this.#finish;
        if (!finish) {
            return;
        }
        for (const node of [...this.#dormant]) {
            this.#dormant.delete(node);
            this.#settle(node, "skipped", undefined, new SkippedError(node.id));
        }
        this.#finished = true;
        this.#finish = undefined;
        if (this.#controller?.signal.aborted) {
            finish.reject(this.#controller.signal.reason);
        } else if (this.#errors.length > 0) {
            finish.reject(new AggregateError(this.#errors, "One or more graph nodes failed"));
        } else {
            finish.resolve();
        }
    }
}

declare const KIND_TYPE: unique symbol;

/** A typed family of nodes. Created with graph.kind(). */
export interface Kind<T = unknown> {
    readonly name: string;
    readonly [KIND_TYPE]?: T;
}

/** Context passed to runs of scoped nodes, workers and wrappers. */
export interface ScopeContext {
    readonly id: NodeId;
    /** The key the node (or the worker's source node) was added under. */
    readonly key: string;
    readonly signal: AbortSignal;
    /** The scope the node belongs to; use it to emit further nodes. */
    readonly scope: Scope;
    /** Dynamic dependency: awaits another node's value. See NodeContext.demand. */
    demand<T>(node: GraphNode<T>): Promise<T>;
}

export type ScopedRun<TDeps extends readonly GraphNode[], TResult> = (
    context: ScopeContext,
    ...dependencies: NodeValues<TDeps>
) => TResult | PromiseLike<TResult>;

export interface ScopedNodeOptions<TDeps extends readonly GraphNode[], TResult> {
    dependencies?: TDeps;
    run: ScopedRun<TDeps, TResult>;
}

export type NodeWorker<TSource, TResult> = (
    context: ScopeContext,
    value: TSource,
    node: GraphNode<TSource>,
) => TResult | PromiseLike<TResult>;

export type NodeWrapper<T> = (context: ScopeContext, next: () => Promise<T>) => T | PromiseLike<T>;

interface Internals {
    kinds: Map<string, Kind>;
    workers: Map<string, { kind: Kind; worker: NodeWorker<unknown, unknown> }[]>;
    wrappers: Map<string, { name: string; wrap: NodeWrapper<unknown> }[]>;
    /** Set when run() starts: the definition phase is over. */
    frozen: boolean;
}

const INTERNALS = new WeakMap<Graph, Internals>();

function normalize<TDeps extends readonly GraphNode[], TResult>(
    spec: ScopedNodeOptions<TDeps, TResult> | ScopedRun<readonly [], TResult>,
): ScopedNodeOptions<TDeps, TResult> {
    return (typeof spec === "function" ? { run: spec } : spec) as ScopedNodeOptions<TDeps, TResult>;
}

/**
 * A hierarchical namespace of kinded nodes. Scopes make phase completion
 * automatic: scope.completion(kind) fulfills once every node in the scope
 * (and its descendants) has settled — including nodes that are created
 * dynamically while the graph runs — without the producers having to wire
 * any edges themselves.
 */
export class Scope {
    readonly name: string;
    readonly path: string;
    #graph: Graph;
    #parent: Scope | undefined;
    #children = new Map<string, Scope>();
    #entries = new Map<string, Map<string, GraphNode>>();
    /** Nodes this scope's completions must wait for (kinded nodes + workers). */
    #members: GraphNode[] = [];
    #completions = new Map<string, GraphNode>();

    /** @internal Use graph.scope() or scope.scope() instead. */
    constructor(graph: Graph, parent: Scope | undefined, name: string) {
        this.#graph = graph;
        this.#parent = parent;
        this.name = name;
        this.path = parent && parent.path ? `${parent.path}/${name}` : name;
    }

    /** Creates or returns a named child scope. */
    scope(name: string): Scope {
        let child = this.#children.get(name);
        if (!child) {
            child = new Scope(this.#graph, this, name);
            this.#children.set(name, child);
        }
        return child;
    }

    get<T>(kind: Kind<T>, key: string): GraphNode<T> | undefined {
        return this.#entries.get(kind.name)?.get(key) as GraphNode<T> | undefined;
    }

    add<TResult, const TDeps extends readonly GraphNode[] = readonly []>(
        kind: Kind<TResult>,
        key: string,
        spec: ScopedNodeOptions<TDeps, TResult> | ScopedRun<readonly [], TResult>,
    ): GraphNode<TResult> {
        if (this.get(kind, key)) {
            throw new Error(`Node "${kind.name}:${key}" already exists in scope "${this.path || "(root)"}"`);
        }
        return this.#create(kind, key, normalize(spec));
    }

    /** Like add(), but returns the existing node if the key is already present. */
    ensure<TResult, const TDeps extends readonly GraphNode[] = readonly []>(
        kind: Kind<TResult>,
        key: string,
        spec: ScopedNodeOptions<TDeps, TResult> | ScopedRun<readonly [], TResult>,
    ): GraphNode<TResult> {
        return this.get(kind, key) ?? this.#create(kind, key, normalize(spec));
    }

    /**
     * A barrier node that fulfills once this scope is quiescent: every node
     * in the scope and its descendants has settled, except nodes that
     * transitively depend on the barrier itself (its consumers). Its value is
     * the collected values of all `kind` nodes in the scope subtree. After it
     * fires the scope is sealed: adding non-consumer nodes throws.
     */
    completion<T>(kind: Kind<T>): GraphNode<T[]> {
        const existing = this.#completions.get(kind.name);
        if (existing) {
            return existing as GraphNode<T[]>;
        }
        const completion = this.#graph.add(`${this.#prefix()}${kind.name}:$completion`, {
            run: () => this.#collect(kind),
        });
        this.#completions.set(kind.name, completion);
        for (const member of this.#allMembers()) {
            this.#attach(member, completion);
        }
        return completion as GraphNode<T[]>;
    }

    #prefix(): string {
        return this.path ? `${this.path}/` : "";
    }

    #create<TResult, TDeps extends readonly GraphNode[]>(
        kind: Kind<TResult>,
        key: string,
        options: ScopedNodeOptions<TDeps, TResult>,
    ): GraphNode<TResult> {
        const internals = INTERNALS.get(this.#graph) as Internals;
        const dependencies = options.dependencies ?? ([] as unknown as TDeps);
        this.#assertOpen(`${kind.name}:${key}`, dependencies);

        const scope = this;
        const graph = this.#graph;
        const id = `${this.#prefix()}${kind.name}:${key}`;
        const node = graph.add(id, {
            dependencies,
            run: (context: NodeContext, ...values: NodeValues<TDeps>) => {
                const scoped: ScopeContext = {
                    id: context.id,
                    key,
                    signal: context.signal,
                    scope,
                    demand: context.demand,
                };
                const compute = () => options.run(scoped, ...values);
                const wrappers = internals.wrappers.get(kind.name) ?? [];
                if (wrappers.length === 0) {
                    return compute();
                }
                // The wrapper chain is real intermediate nodes evaluated on
                // demand: a wrapper that answers without calling next() (a
                // cache hit) leaves the inner nodes dormant.
                let inner = graph.add(`${id}@raw`, { lazy: true, run: () => compute() }) as GraphNode<TResult>;
                for (const registration of wrappers.slice(0, -1)) {
                    const previous = inner;
                    inner = graph.add(`${id}@${registration.name}`, {
                        lazy: true,
                        run: (innerContext) =>
                            registration.wrap({ ...scoped, id: innerContext.id, demand: innerContext.demand }, () => {
                                return innerContext.demand(previous);
                            }),
                    }) as GraphNode<TResult>;
                }
                const outermost = wrappers[wrappers.length - 1];
                return outermost.wrap(scoped, () => context.demand(inner)) as TResult | PromiseLike<TResult>;
            },
        });

        let byKey = this.#entries.get(kind.name);
        if (!byKey) {
            byKey = new Map();
            this.#entries.set(kind.name, byKey);
        }
        byKey.set(key, node);
        this.#members.push(node);
        for (let ancestor: Scope | undefined = this; ancestor; ancestor = ancestor.#parent) {
            for (const completion of ancestor.#completions.values()) {
                this.#attach(node, completion);
            }
        }

        for (const registration of internals.workers.get(kind.name) ?? []) {
            this.#create(registration.kind, key, {
                dependencies: [node] as const,
                run: (context, value) => registration.worker(context, value, node),
            });
        }
        return node;
    }

    /**
     * Attaches workers registered after some nodes of their kind were
     * already added. Runs once when the definition phase ends (run()).
     */
    static materialize(scope: Scope): void {
        const internals = INTERNALS.get(scope.#graph) as Internals;
        for (const [kindName, byKey] of scope.#entries) {
            for (const registration of internals.workers.get(kindName) ?? []) {
                for (const [key, node] of [...byKey]) {
                    if (scope.#entries.get(registration.kind.name)?.has(key)) {
                        continue;
                    }
                    scope.#create(registration.kind, key, {
                        dependencies: [node] as const,
                        run: (context, value) => registration.worker(context, value, node),
                    });
                }
            }
        }
        for (const child of scope.#children.values()) {
            Scope.materialize(child);
        }
    }

    /**
     * A scope seals once a completion fires: new nodes are only allowed if
     * they are consumers of that completion (depend on it), since the
     * completion has already reported the scope as done.
     */
    #assertOpen(label: string, dependencies: readonly GraphNode[]): void {
        for (let ancestor: Scope | undefined = this; ancestor; ancestor = ancestor.#parent) {
            for (const completion of ancestor.#completions.values()) {
                if (completion.status === "pending") {
                    continue;
                }
                const consumes = dependencies.some(
                    (dependency) => dependency === completion || this.#graph.dependsOn(dependency, completion),
                );
                if (!consumes) {
                    throw new Error(
                        `Cannot add "${label}" to scope "${ancestor.path || "(root)"}": its completion "${completion.id}" has already fired`,
                    );
                }
            }
        }
    }

    #attach(member: GraphNode, completion: GraphNode): void {
        if (completion.status !== "pending") {
            return; // vetted by #assertOpen: the member is a consumer
        }
        if (member === completion || this.#graph.dependsOn(member, completion)) {
            return; // consumers of the barrier are not waited on
        }
        this.#graph.connect(member, completion);
    }

    #allMembers(): GraphNode[] {
        const members = [...this.#members];
        for (const child of this.#children.values()) {
            members.push(...child.#allMembers());
        }
        return members;
    }

    #collect<T>(kind: Kind<T>): T[] {
        const values: T[] = [];
        const byKey = this.#entries.get(kind.name);
        if (byKey) {
            for (const node of byKey.values()) {
                if (node.status === "fulfilled") {
                    values.push(node.value as T);
                }
            }
        }
        for (const child of this.#children.values()) {
            values.push(...child.#collect(kind));
        }
        return values;
    }
}
