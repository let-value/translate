import type { GetTextTranslations } from 'gettext-parser';
import {
  msg,
  isMessageId,
  isPluralMessage,
  MessageDescriptor,
  MessageId,
  PluralMessage,
  ContextMessageId,
  ContextPluralMessage,
} from './utils.ts';

function substitute(text: string, values: any[] = []): string {
  return text.replace(/\$\{(\d+)\}/g, (_, i) => String(values[Number(i)]));
}

function parsePluralFunc(header?: string): (n: number) => number {
  const defaultFn = (n: number) => (n !== 1 ? 1 : 0);
  if (!header) return defaultFn;
  const match = header.match(/Plural-Forms:\s*([^\n]*)/i);
  if (!match) return defaultFn;
  const nplMatch = match[1].match(/nplurals\s*=\s*(\d+)/);
  const exprMatch = match[1].match(/plural\s*=\s*([^;]+)/);
  const nplurals = nplMatch ? parseInt(nplMatch[1], 10) : 2;
  const expr = exprMatch ? exprMatch[1] : 'n != 1';
  let fn: (n: number) => number;
  try {
    fn = new Function('n', `return Number(${expr});`) as (n: number) => number;
  } catch {
    fn = defaultFn;
  }
  return (n: number) => {
    const idx = fn(n);
    if (idx < 0) return 0;
    if (idx >= nplurals) return nplurals - 1;
    return idx;
  };
}

type ContextCatalog = Record<string, Record<string, string[]>>;

export class Translator {
  private locale: string;
  private pluralFuncs: Record<string, (n: number) => number> = {};
  private headers: Record<string, string> = {};
  private translations: Record<string, ContextCatalog> = {};
  constructor(
    defaultLocale: string,
    translations: Record<string, GetTextTranslations>
  ) {
    this.locale = defaultLocale;
    for (const [locale, data] of Object.entries(translations)) {
      const contexts: ContextCatalog = {};
      for (const [ctx, msgs] of Object.entries(data.translations || {})) {
        contexts[ctx] = {};
        for (const [id, entry] of Object.entries(msgs)) {
          if (id === '') continue;
          contexts[ctx][id] = entry.msgstr || [];
        }
      }
      this.translations[locale] = contexts;
      this.headers[locale] =
        (data.headers?.['plural-forms']
          ? `Plural-Forms: ${data.headers['plural-forms']}`
          : data.translations?.['']?.['']?.msgstr?.[0]) ?? '';
    }
  }

  useLocale(locale: string): void {
    this.locale = locale;
  }

  gettext(
    msgid:
      | MessageId
      | ContextMessageId
      | MessageDescriptor
      | string
      | TemplateStringsArray,
    ...values: any[]
  ): string {
    const message = isMessageId(msgid)
      ? (msgid as MessageId)
      : msg(msgid as any, ...values);
    const ctx = (message as any).context ?? '';
    const translated =
      this.translations[this.locale]?.[ctx]?.[message.id]?.[0];
    const result = translated && translated.length ? translated : message.message;
    return message.values ? substitute(result, message.values) : result;
  }

  pgettext(
    context: string,
    msgid: MessageId | MessageDescriptor | string | TemplateStringsArray,
    ...values: any[]
  ): string;
  pgettext(
    msgid: ContextMessageId | MessageDescriptor | string | TemplateStringsArray,
    ...values: any[]
  ): string;
  pgettext(...args: any[]): string {
    let ctx: string;
    let message: MessageId;
    if (typeof args[0] === 'string') {
      ctx = args[0];
      const msgid = args[1];
      const vals = args.slice(2);
      message = isMessageId(msgid) ? msgid : msg(msgid as any, ...vals);
    } else {
      message = isMessageId(args[0])
        ? (args[0] as MessageId)
        : msg(args[0] as any, ...args.slice(1));
      ctx = (message as any).context ?? '';
    }
    const translated =
      this.translations[this.locale]?.[ctx]?.[message.id]?.[0];
    const result = translated && translated.length ? translated : message.message;
    return message.values ? substitute(result, message.values) : result;
  }

  private getPluralFunc(locale: string): (n: number) => number {
    if (!this.pluralFuncs[locale]) {
      this.pluralFuncs[locale] = parsePluralFunc(this.headers[locale]);
    }
    return this.pluralFuncs[locale];
  }

  ngettext(
    plural: PluralMessage | ContextPluralMessage,
    n: number,
    ...values: any[]
  ): string;
  ngettext(
    singular:
      | MessageId
      | ContextMessageId
      | MessageDescriptor
      | string
      | TemplateStringsArray,
    plural:
      | MessageId
      | ContextMessageId
      | MessageDescriptor
      | string
      | TemplateStringsArray,
    n: number,
    ...values: any[]
  ): string;
  ngettext(...args: any[]): string {
    let forms: MessageId[];
    let n: number;
    let vals: any[] = [];
    let ctx = '';

    if (isPluralMessage(args[0])) {
      forms = (args[0] as PluralMessage).forms;
      ctx = (args[0] as any).context ?? '';
      n = args[1];
      vals = args.slice(2);
    } else {
      const sing = isMessageId(args[0])
        ? (args[0] as MessageId)
        : msg(args[0] as any, ...args.slice(3));
      const plur = isMessageId(args[1])
        ? (args[1] as MessageId)
        : msg(args[1] as any, ...args.slice(3));
      forms = [sing, plur];
      ctx =
        (sing as any).context ?? (plur as any).context ?? '';
      n = args[2];
      vals = args.slice(3);
    }

    const entry = this.translations[this.locale]?.[ctx]?.[forms[0].id];
    const pluralFunc = this.getPluralFunc(this.locale);
    const index = pluralFunc(n);
    const translated = entry?.[index];
    const defaultForm = forms[index] ?? forms[forms.length - 1];
    const result = translated && translated.length ? translated : defaultForm.message;
    const usedVals = forms.find((f) => f.values)?.values ?? vals;
    return usedVals && usedVals.length ? substitute(result, usedVals) : result;
  }

  npgettext(
    context: string,
    plural: PluralMessage,
    n: number,
    ...values: any[]
  ): string;
  npgettext(
    context: string,
    singular: MessageId | MessageDescriptor | string | TemplateStringsArray,
    plural: MessageId | MessageDescriptor | string | TemplateStringsArray,
    n: number,
    ...values: any[]
  ): string;
  npgettext(
    plural: ContextPluralMessage,
    n: number,
    ...values: any[]
  ): string;
  npgettext(
    singular:
      | ContextMessageId
      | MessageId
      | MessageDescriptor
      | string
      | TemplateStringsArray,
    plural:
      | MessageId
      | MessageDescriptor
      | string
      | TemplateStringsArray,
    n: number,
    ...values: any[]
  ): string;
  npgettext(...args: any[]): string {
    if (typeof args[0] === 'string') {
      const ctx = args[0];
      if (isPluralMessage(args[1])) {
        return this.ngettext(
          { ...(args[1] as PluralMessage), context: ctx },
          args[2],
          ...args.slice(3)
        );
      }
      const sing = isMessageId(args[1])
        ? (args[1] as MessageId)
        : msg(args[1] as any, ...args.slice(4));
      const plur = isMessageId(args[2])
        ? (args[2] as MessageId)
        : msg(args[2] as any, ...args.slice(4));
      return this.ngettext(
        { forms: [sing, plur], context: ctx },
        args[3],
        ...args.slice(4)
      );
    }

    return this.ngettext(args[0], ...args.slice(1));
  }
}
