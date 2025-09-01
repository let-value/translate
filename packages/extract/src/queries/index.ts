import { gettextInvalidQuery, gettextQuery } from "./gettext.ts";
import { msgInvalidQuery, msgQuery } from "./msg.ts";
import { pluralQuery } from "./plural.ts";
import type { QuerySpec } from "./types.ts";

export type { MessageMatch, QuerySpec } from "./types.ts";

export const queries: QuerySpec[] = [
    msgQuery,
    msgInvalidQuery,
    gettextQuery,
    gettextInvalidQuery,
    pluralQuery,
];
