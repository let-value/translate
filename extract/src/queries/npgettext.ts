import { withComment } from "./comment.ts";
import { msgArgs } from "./msg.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const msgCall = callPattern("msg", msgArgs).replace(/@call/g, "@msg").replace(/@func/g, "@msgfn");

export const npgettextQuery: QuerySpec = withComment({
    pattern: callPattern(
        "npgettext",
        `(arguments (string (string_fragment) @msgctxt) "," (
            (${msgCall} ("," )?)+
            (number) @n
        ))`,
    ),
    extract: extractPluralForms("npgettext"),
});
