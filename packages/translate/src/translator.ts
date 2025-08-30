import type { GetTextTranslations } from 'gettext-parser';
import {
  msg,
  MessageId,
  PluralMessageId,
  ContextMessageId,
  ContextPluralMessageId,
  plural,
  MessageFunction,
  PluralFunction,
} from './helpers.ts';
import { pluralFunc, substitute } from './utils.ts';

export class Translator {
  private locale: string;
  private translations: Record<string, GetTextTranslations> = {};

  constructor(
    defaultLocale: string,
    translations: Record<string, GetTextTranslations>
  ) {
    this.locale = defaultLocale;
    this.translations = translations;
  }

  msg = msg;
  plural = plural;

  useLocale(locale: string): void {
    this.locale = locale;
  }

  getText({ id, message, values }: MessageId, context = ''): string {
    const translated = this.translations[this.locale].translations?.[context]?.[id];
    const result = translated && translated.msgstr ? translated.msgstr[0] : message;
    return values ? substitute(result, values) : result;
  }

  getPluralText({ forms, n }: PluralMessageId, context = ''): string {
    const entry = this.translations[this.locale].translations?.[context]?.[forms[0].id];
    const index = pluralFunc(this.locale)(n);
    const translated = entry.msgstr[index];
    const defaultForm = forms[index] ?? forms[forms.length - 1];
    const result = translated && translated.length ? translated : defaultForm.message;
    const usedVals = forms.find((f) => f.values)?.values;
    return usedVals && usedVals.length ? substitute(result, usedVals) : result;
  }

  gettext(id: MessageId): string;
  gettext(...args: Parameters<MessageFunction>): string;
  gettext(...args: [MessageId] | Parameters<MessageFunction>): string {
    const [source] = args;

    if (typeof source === 'object' && 'id' in source && 'message' in source) {
      return this.getText(source);
    }

    return this.getText(msg(...args as Parameters<MessageFunction>));
  }

  pgettext(id: ContextMessageId): string;
  pgettext(context: string, ...args: Parameters<typeof this.gettext>): string;
  pgettext(context: ContextMessageId | string, ...args: [] | [MessageId] | Parameters<MessageFunction>): string {
    if (typeof context === "object") {
      return this.getText(context.id, context.context);
    }

    const [source] = args;

    if (typeof source === 'object' && 'id' in source && 'message' in source) {
      return this.getText(source);
    }

    return this.getText(msg(...args as Parameters<MessageFunction>), context);
  }

  ngettext(id: PluralMessageId): string;
  ngettext(...args: Parameters<PluralFunction>): string;
  ngettext(...args: [PluralMessageId] | Parameters<PluralFunction>): string {
    const [source] = args;

    if (typeof source === 'object' && 'forms' in source) {
      return this.getPluralText(source);
    }

    return this.getPluralText(plural(...args as Parameters<PluralFunction>));
  }

  npgettext(id: ContextPluralMessageId): string;
  npgettext(context: string, ...args: Parameters<typeof this.ngettext>): string;
  npgettext(context: ContextPluralMessageId | string, ...args: [] | [PluralMessageId] | Parameters<PluralFunction>): string {
    if (typeof context === "object") {
      return this.getPluralText(context.id, context.context);
    }

    const [source] = args;

    if (typeof source === 'object' && 'forms' in source) {
      return this.getPluralText(source);
    }

    return this.getPluralText(plural(...args as Parameters<PluralFunction>));
  }
}
