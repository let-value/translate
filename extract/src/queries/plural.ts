import { withComment } from "./comment.ts";
import { messageArgs } from "./message.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const msgCall = callPattern("message", messageArgs, false)
    .replace(/@call/g, "@msg")
    .replace(/@func/g, "@msgfn");

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
