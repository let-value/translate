import { withComment } from "./comment.ts";
import { msgArgs } from "./msg.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const msgCall = callPattern("msg", msgArgs, false).replace(/@call/g, "@msg").replace(/@func/g, "@msgfn");

export const pluralQuery: QuerySpec = withComment({
    pattern: callPattern(
        "plural",
        `(arguments (
            (${msgCall} ("," )?)+
            (number) @n
        ))`,
        false,
    ),
    extract: extractPluralForms("plural"),
});
