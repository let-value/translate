import type { GetTextTranslations } from 'gettext-parser';
import {
  msg,
  isMessageId,
  isPluralMessage,
  MessageDescriptor,
  MessageId,
  PluralMessage,
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

export class Translator {
  private locale: string;
  private pluralFuncs: Record<string, (n: number) => number> = {};
  constructor(
    defaultLocale: string,
    private translations: Record<string, GetTextTranslations>
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
    const result = translated && translated.length ? translated : message.message;
    return message.values ? substitute(result, message.values) : result;
  }

  private getPluralFunc(locale: string): (n: number) => number {
    if (!this.pluralFuncs[locale]) {
      const localeData = this.translations[locale];
      const header =
        (localeData?.headers?.['plural-forms']
          ? `Plural-Forms: ${localeData.headers['plural-forms']}`
          : localeData?.translations?.['']?.['']?.msgstr?.[0]) ??
        '';
      this.pluralFuncs[locale] = parsePluralFunc(header);
    }
    return this.pluralFuncs[locale];
  }

  ngettext(
    plural: PluralMessage,
    n: number,
    ...values: any[]
  ): string;
  ngettext(
    singular: MessageId | MessageDescriptor | string | TemplateStringsArray,
    plural: MessageId | MessageDescriptor | string | TemplateStringsArray,
    n: number,
    ...values: any[]
  ): string;
  ngettext(...args: any[]): string {
    let forms: MessageId[];
    let n: number;
    let vals: any[] = [];

    if (isPluralMessage(args[0])) {
      forms = args[0].forms;
      n = args[1];
      vals = args.slice(2);
    } else {
      const sing = isMessageId(args[0])
        ? args[0]
        : msg(args[0] as any, ...args.slice(3));
      const plur = isMessageId(args[1])
        ? args[1]
        : msg(args[1] as any, ...args.slice(3));
      forms = [sing, plur];
      n = args[2];
      vals = args.slice(3);
    }

    const localeData = this.translations[this.locale];
    const entry = localeData?.translations?.['']?.[forms[0].id];
    const pluralFunc = this.getPluralFunc(this.locale);
    const index = pluralFunc(n);
    const translated = entry?.msgstr?.[index];
    const defaultForm = forms[index] ?? forms[forms.length - 1];
    const result = translated && translated.length ? translated : defaultForm.message;
    const usedVals = forms.find((f) => f.values)?.values ?? vals;
    return usedVals && usedVals.length ? substitute(result, usedVals) : result;
  }
}
