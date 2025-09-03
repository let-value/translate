import { contextMsgQuery, contextPluralQuery } from "./context.ts";
import { gettextInvalidQuery, gettextQuery } from "./gettext.ts";
import { messageInvalidQuery, messageQuery } from "./message.ts";
import { ngettextQuery } from "./ngettext.ts";
import { npgettextQuery } from "./npgettext.ts";
import { pgettextQuery } from "./pgettext.ts";
import { pluralQuery } from "./plural.ts";
import type { QuerySpec } from "./types.ts";

export type { MessageMatch, QuerySpec } from "./types.ts";

export const queries: QuerySpec[] = [
    messageQuery,
    messageInvalidQuery,
    gettextQuery,
    gettextInvalidQuery,
    pluralQuery,
    ngettextQuery,
    pgettextQuery,
    npgettextQuery,
    contextMsgQuery,
    contextPluralQuery,
];
