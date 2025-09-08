import { withComment } from "./comment.ts";
import { messageArg, messageArgs } from "./message.ts";
import { extractPluralForms } from "./plural-utils.ts";
import type { QuerySpec } from "./types.ts";
import { callPattern } from "./utils.ts";

const msgCall = callPattern("message", messageArgs)
    .replace(/@call/g, "@msg")
    .replace(/@func/g, "@msgfn");
const plainMsg = `(${messageArg}) @msg`;
const msgArg = `[${msgCall} ${plainMsg}]`;

export const ngettextQuery: QuerySpec = withComment({
    pattern: callPattern(
        "ngettext",
        `(arguments ${msgArg} "," ${msgArg} ("," ${msgArg})* "," (_) @n)`,
    ),
    extract: extractPluralForms("ngettext"),
});
