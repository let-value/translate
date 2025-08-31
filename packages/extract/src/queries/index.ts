import { tQuery } from './t';
import { msgStringQuery, msgDescriptorQuery, msgTemplateQuery } from './msg';
import type { QuerySpec } from './types';

export type { QuerySpec, MessageMatch } from './types';

export const messageQueries: QuerySpec[] = [
  msgStringQuery,
  msgDescriptorQuery,
  msgTemplateQuery,
  tQuery,
];
