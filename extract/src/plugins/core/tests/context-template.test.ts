import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSource } from "../parse.ts";

test("extracts context from tagged template builder alongside plain message", () => {
    const source = [
        'import { context, message } from "@let-value/translate";',
        "",
        "context`title`.message`Sign out`;",
        "message`Sign out`;",
        "",
    ].join("\n");

    const { translations } = parseSource(source, "/project/example.ts");

    const messages = translations
        .map(({ id, context }) => ({ id, context }))
        .sort((a, b) => {
            if (a.context && !b.context) return -1;
            if (!a.context && b.context) return 1;
            return a.id.localeCompare(b.id);
        });

    assert.deepEqual(messages, [
        { id: "Sign out", context: "title" },
        { id: "Sign out", context: undefined },
    ]);
});

test("detects magic comment entrypoint promotion", () => {
    const source = [
        'import { message } from "@let-value/translate";',
        "",
        "/* translate-entrypoint */",
        'message("Hello");',
        "",
    ].join("\n");

    const result = parseSource(source, "/project/example.ts");

    assert.equal(result.entrypoint, true);
});
