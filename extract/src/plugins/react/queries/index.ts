import type { QuerySpec } from "../../core/queries/types.ts";
import { messageQuery } from "./message.ts";
import { pluralQuery } from "./plural.ts";

export const queries: QuerySpec[] = [messageQuery, pluralQuery];
