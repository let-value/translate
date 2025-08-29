export interface MessageDescriptor {
  id?: string;
  message?: string;
}

export interface MessageId {
  id: string;
  message: string;
}

export interface TranslationEntry {
  msgid: string;
  msgstr: string[];
}

export interface PoData {
  translations: Record<string, Record<string, TranslationEntry>>;
}

function buildFromTemplate(strings: TemplateStringsArray, values: any[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) result += values[i];
  }
  return result;
}

export function msg(
  descriptor: MessageDescriptor
): MessageId;
export function msg(
  text: string
): MessageId;
export function msg(
  strings: TemplateStringsArray,
  ...values: any[]
): MessageId;
export function msg(arg: any, ...values: any[]): MessageId {
  if (typeof arg === 'string') {
    return { id: arg, message: arg };
  }

  if (Array.isArray(arg) && typeof (arg as any).raw !== 'undefined') {
    const text = buildFromTemplate(arg as TemplateStringsArray, values);
    return { id: text, message: text };
  }

  if (typeof arg === 'object' && arg) {
    const id = arg.id ?? arg.message ?? '';
    const message = arg.message ?? arg.id ?? '';
    return { id, message };
  }

  throw new Error('Invalid msg argument');
}

function isMessageId(obj: any): obj is MessageId {
  return obj && typeof obj === 'object' && 'id' in obj && 'message' in obj;
}

export class Translator {
  private locale: string;
  constructor(
    defaultLocale: string,
    private translations: Record<string, PoData>
  ) {
    this.locale = defaultLocale;
  }

  useLocale(locale: string): void {
    this.locale = locale;
  }

  gettext(
    msgid: MessageId | MessageDescriptor | string | TemplateStringsArray,
    ...values: any[]
  ): string {
    const message = isMessageId(msgid)
      ? msgid
      : msg(msgid as any, ...values);
    const localeData = this.translations[this.locale];
    const translated =
      localeData?.translations?.['']?.[message.id]?.msgstr?.[0];
    return translated && translated.length ? translated : message.message;
  }
}

