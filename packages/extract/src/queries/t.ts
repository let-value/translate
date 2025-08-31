import type { QuerySpec, MessageMatch } from './types';

export const tQuery: QuerySpec = {
  pattern: `(
    (call_expression
      function: (identifier) @func
      arguments: (arguments (string (string_fragment) @msgid))
    ) @call
    (#match? @func "^(t|ngettext)$")
  )`,
  extract(match) {
    const call = match.captures.find(c => c.name === 'call')!.node;
    const msgidNode = match.captures.find(c => c.name === 'msgid')!.node;
    return [{ node: call, msgid: msgidNode.text }];
  }
};
