import type { GetTextTranslations } from "gettext-parser";
import { act, Suspense } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { LocaleProvider, TranslationsProvider, useTranslations } from "../src/index.ts";

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const catalog: GetTextTranslations = {
    charset: "utf-8",
    headers: {},
    translations: { "": { Hello: { msgid: "Hello", msgstr: ["Hola"] } } },
};

/**
 * A fresh translations map with a fresh loader every time, so the server render
 * and the hydration render do not share a cached translator — the same way two
 * bundles hold two copies of the page module.
 */
function makeTranslations(delay = 5) {
    const calls = { count: 0 };
    const translations = {
        en: () => {
            calls.count++;
            return new Promise<{ default: GetTextTranslations }>((resolve) => {
                setTimeout(() => resolve({ default: catalog }), delay);
            });
        },
    };
    return { translations, calls };
}

function Greeting() {
    const t = useTranslations();
    return <span id="greeting">{t.message`Hello`}</span>;
}

type Translations = Record<string, () => Promise<{ default: GetTextTranslations }>>;

const fallback = <span id="fallback">loading</span>;

/** The app puts its boundary between the provider and the consumer. */
function BoundaryInside({ translations }: { translations: Translations }) {
    return (
        <LocaleProvider locale={"en" as never}>
            <TranslationsProvider translations={translations as never}>
                <Suspense fallback={fallback}>
                    <Greeting />
                </Suspense>
            </TranslationsProvider>
        </LocaleProvider>
    );
}

/** The app puts its boundary above the provider. */
function BoundaryOutside({ translations }: { translations: Translations }) {
    return (
        <Suspense fallback={fallback}>
            <LocaleProvider locale={"en" as never}>
                <TranslationsProvider translations={translations as never}>
                    <Greeting />
                </TranslationsProvider>
            </LocaleProvider>
        </Suspense>
    );
}

const placements = [
    ["boundary inside the provider", BoundaryInside],
    ["boundary outside the provider", BoundaryOutside],
] as const;

async function renderHtml(element: React.ReactElement) {
    const stream = await renderToReadableStream(element);
    await stream.allReady;
    return await new Response(stream).text();
}

function mount(html: string) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = html;
    return container;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe.each(placements)("%s", (_name, App) => {
    test("server rendering inlines the catalog it resolved", async () => {
        const { translations } = makeTranslations();
        const html = await renderHtml(<App translations={translations} />);

        expect(html).toContain("Hola");
        expect(html).toContain("data-translations");
    });

    test("hydrates without discarding the server DOM", async () => {
        const server = makeTranslations();
        const html = await renderHtml(<App translations={server.translations} />);
        const container = mount(html);
        const serverNode = container.querySelector("#greeting");

        const client = makeTranslations();
        const errors: unknown[] = [];
        const root = hydrateRoot(container, <App translations={client.translations} />, {
            onRecoverableError: (error) => errors.push(error),
        });
        await flush();

        // Same DOM node instance: React reused the server markup instead of
        // tearing the boundary down and rebuilding it.
        expect(container.querySelector("#greeting")).toBe(serverNode);
        expect(container.querySelector("#greeting")?.textContent).toBe("Hola");
        expect(errors).toEqual([]);
        // The catalog came from the inlined payload, so the chunk is never fetched.
        expect(client.calls.count).toBe(0);

        root.unmount();
        container.remove();
    });

    test("never shows the fallback during hydration", async () => {
        const server = makeTranslations();
        const html = await renderHtml(<App translations={server.translations} />);
        const container = mount(html);

        const seen: string[] = [];
        const observer = new MutationObserver(() => {
            if (container.querySelector("#fallback")) seen.push("fallback");
        });
        observer.observe(container, { childList: true, subtree: true });

        const root = hydrateRoot(container, <App translations={makeTranslations().translations} />);
        await flush();
        observer.disconnect();

        expect(seen).toEqual([]);

        root.unmount();
        container.remove();
    });

    test("client rendering shows the app's own fallback and loads lazily", async () => {
        const { translations, calls } = makeTranslations(30);
        const container = mount("");
        const root = createRoot(container);

        // Unlike hydration, a concurrent client render only flushes inside act().
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        await act(async () => {
            root.render(<App translations={translations} />);
        });

        // The library wraps none of the app's content in a boundary of its own,
        // so this is the app's fallback showing while the catalog loads.
        expect(container.querySelector("#fallback")).not.toBeNull();

        await act(async () => {
            await flush();
        });
        globalThis.IS_REACT_ACT_ENVIRONMENT = false;

        expect(container.querySelector("#greeting")?.textContent).toBe("Hola");
        expect(calls.count).toBe(1);

        root.unmount();
        container.remove();
    });
});

describe("nested providers", () => {
    const outerCatalog: GetTextTranslations = {
        charset: "utf-8",
        headers: {},
        translations: { "": { Shared: { msgid: "Shared", msgstr: ["Compartido"] } } },
    };

    function makeOuter() {
        const calls = { count: 0 };
        const translations = {
            en: () => {
                calls.count++;
                return new Promise<{ default: GetTextTranslations }>((resolve) => {
                    setTimeout(() => resolve({ default: outerCatalog }), 5);
                });
            },
        };
        return { translations, calls };
    }

    function Nested() {
        const t = useTranslations();
        return (
            <span id="nested">
                {t.message`Hello`}/{t.message`Shared`}
            </span>
        );
    }

    function NestedApp({ outer, inner }: { outer: Translations; inner: Translations }) {
        return (
            <LocaleProvider locale={"en" as never}>
                <TranslationsProvider translations={outer as never}>
                    <TranslationsProvider translations={inner as never}>
                        <Suspense fallback={fallback}>
                            <Nested />
                        </Suspense>
                    </TranslationsProvider>
                </TranslationsProvider>
            </LocaleProvider>
        );
    }

    test("seeds the whole chain so the merged catalog survives hydration", async () => {
        const html = await renderHtml(
            <NestedApp outer={makeOuter().translations} inner={makeTranslations().translations} />,
        );
        const container = mount(html);
        const serverNode = container.querySelector("#nested");
        expect(serverNode?.textContent).toBe("Hola/Compartido");

        const outer = makeOuter();
        const inner = makeTranslations();
        const errors: unknown[] = [];
        const root = hydrateRoot(container, <NestedApp outer={outer.translations} inner={inner.translations} />, {
            onRecoverableError: (error) => errors.push(error),
        });
        await flush();

        expect(container.querySelector("#nested")).toBe(serverNode);
        expect(container.querySelector("#nested")?.textContent).toBe("Hola/Compartido");
        expect(errors).toEqual([]);
        expect(outer.calls.count).toBe(0);
        expect(inner.calls.count).toBe(0);

        root.unmount();
        container.remove();
    });
});
