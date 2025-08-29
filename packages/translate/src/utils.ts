export interface MessageDescriptor {
  id?: string;
  message?: string;
}

export interface MessageId {
  id: string;
  message: string;
  values?: any[];
}

export interface PluralMessage {
  forms: MessageId[];
}

export interface ContextMessageId extends MessageId {
  context: string;
}

export interface ContextPluralMessage extends PluralMessage {
  context: string;
}

export interface ContextBuilder {
  msg(
    descriptor: MessageDescriptor
  ): ContextMessageId;
  msg<T extends string>(text: string extends T ? never : T): ContextMessageId;
  msg(strings: TemplateStringsArray, ...values: any[]): ContextMessageId;
  plural(
    ...forms: Array<
      MessageDescriptor | MessageId | string | TemplateStringsArray
    >
  ): ContextPluralMessage;
}

function buildFromTemplate(strings: TemplateStringsArray): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < strings.length - 1) result += '${' + i + '}';
  }
  return result;
}

export function msg(
  descriptor: MessageDescriptor
): MessageId;
export function msg<
  T extends string
>(text: string extends T ? never : T): MessageId;
export function msg(
  strings: TemplateStringsArray,
  ...values: any[]
): MessageId;
export function msg(arg: any, ...values: any[]): MessageId {
  if (typeof arg === 'string') {
    return { id: arg, message: arg };
  }

  if (Array.isArray(arg) && typeof (arg as any).raw !== 'undefined') {
    const text = buildFromTemplate(arg as TemplateStringsArray);
    return { id: text, message: text, values };
  }

  if (typeof arg === 'object' && arg) {
    const id = arg.id ?? arg.message ?? '';
    const message = arg.message ?? arg.id ?? '';
    return { id, message };
  }

  throw new Error('Invalid msg argument');
}

export function isMessageId(obj: any): obj is MessageId {
  return obj && typeof obj === 'object' && 'id' in obj && 'message' in obj;
}

export function isPluralMessage(obj: any): obj is PluralMessage {
  return obj && typeof obj === 'object' && Array.isArray(obj.forms);
}

export function plural(
  ...forms: Array<MessageDescriptor | MessageId | string | TemplateStringsArray>
): PluralMessage {
  const messages = forms.map((f) =>
    isMessageId(f) ? f : msg(f as any)
  );
  return { forms: messages };
}

const basePlural = plural;

export function context(ctx: string): ContextBuilder {
  return {
    msg(arg: any, ...values: any[]) {
      return { ...msg(arg as any, ...values), context: ctx };
    },
    plural(
      ...forms: Array<
        MessageDescriptor | MessageId | string | TemplateStringsArray
      >
    ) {
      return { ...basePlural(...forms), context: ctx };
    },
  };
}
