import { withComment } from "./comment.ts";
import { msgArgs } from "./msg.ts";
import { extractPluralForms } from "./plural-utils.ts";
import { callPattern } from "./utils.ts";
import type { QuerySpec } from "./types.ts";

const msgCall = callPattern("msg", msgArgs)
    .replace(/@call/g, "@msg")
    .replace(/@func/g, "@msgfn");

export const ngettextQuery: QuerySpec = withComment({
    pattern: callPattern(
        "ngettext",
        `(arguments (
            (${msgCall} ("," )?)+
            (number) @n
        ))`,
    ),
    extract: extractPluralForms("ngettext"),
});
