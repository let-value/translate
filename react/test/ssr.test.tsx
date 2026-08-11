import type { GetTextTranslations } from "gettext-parser";
import { act, Suspense } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
import { LocaleProvider, TranslationsProvider, useTranslations } from "../src/index.ts";

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

function App({ translations }: { translations: Record<string, () => Promise<{ default: GetTextTranslations }>> }) {
    return (
        <LocaleProvider locale={"en" as never}>
            <TranslationsProvider translations={translations as never}>
                <Suspense fallback={<span id="fallback">loading</span>}>
                    <Greeting />
                </Suspense>
            </TranslationsProvider>
        </LocaleProvider>
    );
}

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

describe("server rendering", () => {
    test("inlines the catalog it resolved", async () => {
        const { translations } = makeTranslations();
        const html = await renderHtml(<App translations={translations} />);

        expect(html).toContain("Hola");
        expect(html).toContain("data-translations");
        expect(html).not.toContain("loading");
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
});

describe("client rendering", () => {
    test("still loads lazily when there is no server payload", async () => {
        const { translations, calls } = makeTranslations();
        const container = mount("");
        const root = createRoot(container);

        // Unlike hydration, a concurrent client render only flushes inside act().
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        await act(async () => {
            root.render(<App translations={translations} />);
        });
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
