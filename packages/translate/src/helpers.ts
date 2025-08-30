import { assert } from "./utils";

export interface MessageDescriptor {
  id?: string;
  message?: string;
}

export interface MessageId {
  id: string;
  message: string;
  values?: any[];
}

export interface PluralMessageId {
  forms: MessageId[];
  n: number;
}

export interface ContextMessageId {
  context: string;
  id: MessageId;
}

export interface ContextPluralMessageId {
  context: string;
  id: PluralMessageId;
}

function buildFromTemplate(strings: TemplateStringsArray): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < strings.length - 1) result += '${' + i + '}';
  }
  return result;
}

type IsUnion<T, U = T> =
  (T extends any ? (x: T) => 0 : never) extends (x: U) => 0 ? false : true;

type StrictStaticString<T extends string> =
  string extends T ? never : IsUnion<T> extends true ? never : T;

export function msg<T extends string>(id: StrictStaticString<T>): MessageId;
export function msg(descriptor: MessageDescriptor): MessageId;
export function msg(strings: TemplateStringsArray, ...values: unknown[]): MessageId;
export function msg(source: string | MessageDescriptor | TemplateStringsArray, ...values: unknown[]): MessageId {
  if (typeof source === 'string') {
    return { id: source, message: source };
  }

  if (typeof source === 'object' && "reduce" in source) {
    const id = buildFromTemplate(source);
    return { id, message: id, values };
  }

  const id = source.id ?? source.message ?? '';
  const message = source.message ?? source.id ?? '';
  return { id, message };
}

export type MessageFunction = typeof msg;

export function plural(
  ...args: [...forms: MessageId[], n: number]
): PluralMessageId {
  assert(args.length > 1, 'At least one plural form and n are required');

  const n = args[args.length - 1] as number;
  assert(typeof n === 'number', 'The last argument must be a number');

  const forms = args.slice(0, -1) as MessageId[];

  return { forms, n };
}

export type PluralFunction = typeof plural;

export interface ContextBuilder {
  msg<T extends string>(id: StrictStaticString<T>): ContextMessageId;
  msg(...args: Parameters<MessageFunction>): ContextMessageId;
  plural(...args: Parameters<PluralFunction>): ContextPluralMessageId;
}

const basePlural = plural;

export function context(context: string): ContextBuilder {
  return {
    msg: (...args: Parameters<MessageFunction>) => {
      return { id: msg(...args), context };
    },
    plural(...forms: Parameters<PluralFunction>) {
      return { id: basePlural(...forms), context };
    },
  };
}
