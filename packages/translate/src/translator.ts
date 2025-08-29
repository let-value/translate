import { msg, isMessageId, MessageDescriptor, MessageId } from './utils.ts';

export interface TranslationEntry {
  msgid: string;
  msgstr: string[];
}

export interface PoData {
  translations: Record<string, Record<string, TranslationEntry>>;
}

function substitute(text: string, values: any[] = []): string {
  return text.replace(/\$\{(\d+)\}/g, (_, i) => String(values[Number(i)]));
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
    const result = translated && translated.length ? translated : message.message;
    return message.values ? substitute(result, message.values) : result;
  }
}
