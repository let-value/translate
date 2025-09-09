import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { parseSource } from "../parse.ts";
import { getMatches } from "../../core/queries/tests/utils.ts";
import { messageQuery } from "../queries/message.ts";
import { pluralQuery } from "../queries/plural.ts";

const valid = readFileSync(new URL("./fixtures/valid.tsx", import.meta.url), "utf8");
const invalid = readFileSync(new URL("./fixtures/invalid.tsx", import.meta.url), "utf8");

suite("react plugin", () => {
    test("extracts messages and plurals", () => {
        const { translations } = parseSource(valid, "valid.tsx");
        const simple = translations.map(({ id, plural, context, message }) => ({
            id,
            plural,
            context,
            message,
        }));
        assert.deepEqual(simple, [
            { id: "hello", message: ["hello"], plural: undefined, context: undefined },
            { id: "hello ${name}", message: ["hello ${name}"], plural: undefined, context: undefined },
            { id: "run", message: ["run"], plural: undefined, context: "verb" },
            { id: "hello", message: ["hello"], plural: undefined, context: "ctx" },
            { id: "one", plural: "many", message: ["one", "many"], context: undefined },
            {
                id: "One ${name}",
                plural: "Many ${name}s",
                message: ["One ${name}", "Many ${name}s"],
                context: "count",
            },
            {
                id: "simple one",
                plural: "simple many",
                message: ["simple one", "simple many"],
                context: undefined,
            },
        ]);
    });

    test("reports invalid expressions", () => {
        const msgMatches = getMatches(invalid, "invalid.tsx", messageQuery);
        assert.equal(msgMatches[0].error, "JSX expressions must be simple identifiers");
        const plMatches = getMatches(invalid, "invalid.tsx", pluralQuery);
        assert.equal(plMatches[0].error, "JSX expressions must be simple identifiers");
    });
});
