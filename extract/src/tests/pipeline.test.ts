import assert from "node:assert/strict";
import path from "node:path";
import { suite, test } from "node:test";
import type { GetTextTranslation } from "gettext-parser";

import { collect, type Message } from "../messages.ts";
import { runPipeline, type ExtractorPlugin } from "../plugin.ts";

suite("pipeline", () => {
    test("passes collected messages to generate hooks", async () => {
        const entry = path.join(process.cwd(), "dummy.ts");
        const raw: GetTextTranslation[] = [{ msgid: "hello", msgstr: [""] }];
        const expected = collect(raw);
        let generated: { locale: string; messages: Message[] } | undefined;

        const plugin: ExtractorPlugin = {
            name: "mock",
            setup(build) {
                build.onResolve({ filter: /.*/ }, () => entry);
                build.onLoad({ filter: /.*/ }, () => ({ contents: "" }));
                build.onExtract({ filter: /.*/ }, () => ({ messages: raw, imports: [] }));
                build.onCollect((messages) => collect(messages));
                build.onGenerate((args) => {
                    generated = args;
                });
            },
        };

        await runPipeline(entry, [plugin], "en");
        assert.deepEqual(generated, { locale: "en", messages: expected });
    });
});

