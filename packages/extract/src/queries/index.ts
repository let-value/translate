import { msgDescriptorQuery, msgInvalidQuery, msgStringQuery, msgTemplateQuery } from "./msg.ts";
import type { QuerySpec } from "./types.ts";

export type { MessageMatch, QuerySpec } from "./types.ts";

export const queries: QuerySpec[] = [msgStringQuery, msgDescriptorQuery, msgTemplateQuery, msgInvalidQuery];
