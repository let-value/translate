import { msgDescriptorQuery, msgStringQuery, msgTemplateQuery } from "./msg";
import type { QuerySpec } from "./types";

export type { MessageMatch, QuerySpec } from "./types";

export const queries: QuerySpec[] = [
	msgStringQuery,
	msgDescriptorQuery,
	msgTemplateQuery,
];
