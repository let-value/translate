import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suite, test } from "node:test";
import { getMatches } from "../../core/queries/tests/utils.ts";
import { parseSource } from "../parse.ts";
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
            { id: "Cookie Policy", message: ["Cookie Policy"], plural: undefined, context: undefined },
            { id: "Terms of Service", message: ["Terms of Service"], plural: undefined, context: undefined },
            { id: "Privacy Policy", message: ["Privacy Policy"], plural: undefined, context: undefined },
            { id: "hello", message: ["hello"], plural: undefined, context: undefined },
            { id: "hello ${name}", message: ["hello ${name}"], plural: undefined, context: undefined },
            { id: "run", message: ["run"], plural: undefined, context: "verb" },
            { id: "hello", message: ["hello"], plural: undefined, context: "ctx" },
            {
                id: "${termsOfService} • ${privacyPolicy} • ${cookiePolicy}",
                message: ["${termsOfService} • ${privacyPolicy} • ${cookiePolicy}"],
                plural: undefined,
                context: undefined,
            },
            {
                id: "By signing up you’re 16+ and accept ${termsOfService} & ${privacyPolicy}.",
                message: ["By signing up you’re 16+ and accept ${termsOfService} & ${privacyPolicy}."],
                plural: undefined,
                context: undefined,
            },
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
        assert.equal(msgMatches[0].error, "JSX expressions must be simple identifiers, strings, or template literals");
        const plMatches = getMatches(invalid, "invalid.tsx", pluralQuery);
        assert.equal(plMatches[0].error, "JSX expressions must be simple identifiers, strings, or template literals");
    });
});
