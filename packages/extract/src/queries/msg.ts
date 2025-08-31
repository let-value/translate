import type { QuerySpec } from './types';

export const msgStringQuery: QuerySpec = {
  pattern: `(
    (call_expression
      function: (identifier) @func
      arguments: (arguments (string (string_fragment) @msgid))
    ) @call
    (#match? @func "^msg$")
  )`,
  extract(match) {
    const call = match.captures.find(c => c.name === 'call')!.node;
    const msgid = match.captures.find(c => c.name === 'msgid')!.node.text;
    return [{ node: call, msgid }];
  },
};

export const msgDescriptorQuery: QuerySpec = {
  pattern: `(
    (call_expression
      function: (identifier) @func
      arguments: (arguments
        (object
          (_)*
          (pair
            key: (property_identifier) @id_key
            value: (string (string_fragment) @id)
            (#eq? @id_key "id")
          )?
          (_)*
          (pair
            key: (property_identifier) @msg_key
            value: (string (string_fragment) @message)
            (#eq? @msg_key "message")
          )?
          (_)*
        )
      )
    ) @call
    (#match? @func "^msg$")
  )`,
  extract(match) {
    const call = match.captures.find(c => c.name === 'call')!.node;
    const id = match.captures.find(c => c.name === 'id')?.node.text;
    const message = match.captures.find(c => c.name === 'message')?.node.text;
    const msgid = id ?? message;
    return msgid ? [{ node: call, msgid }] : [];
  },
};

export const msgTemplateQuery: QuerySpec = {
  pattern: `(
    (call_expression
      function: (identifier) @func
      arguments: (template_string) @tpl
    ) @call
    (#match? @func "^msg$")
  )`,
  extract(match) {
    const call = match.captures.find(c => c.name === 'call')!.node;
    const tpl = match.captures.find(c => c.name === 'tpl')!.node;
    const text = tpl.text.slice(1, -1);
    return [{ node: call, msgid: text }];
  },
};
