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
  MessageDescriptor,
} from './helpers.ts';
import { pluralFunc, StrictStaticString, substitute } from './utils.ts';

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

  getText({ msgid, msgstr, values }: MessageId, msgctxt = ''): string {
    const translated = this.translations[this.locale]?.translations?.[msgctxt]?.[msgid];
    const result = translated && translated.msgstr ? translated.msgstr[0] : msgstr;
    return values ? substitute(result, values) : result;
  }

  getPluralText({ forms, n }: PluralMessageId, msgctxt = ''): string {
    const entry = this.translations[this.locale]?.translations?.[msgctxt]?.[forms[0].msgid];
    const index = pluralFunc(this.locale)(n);
    const form = forms[index] ?? forms[forms.length - 1];
    const translated = entry?.msgstr?.[index];
    const result = translated && translated.length ? translated : form.msgstr;
    const usedVals = form.values && form.values.length ? form.values : forms[0].values;
    return usedVals && usedVals.length ? substitute(result, usedVals) : result;
  }

  gettext(id: MessageId): string;
  gettext<T extends string>(id: StrictStaticString<T>): string;
  gettext(...args: Parameters<MessageFunction>): string;
  gettext(...args: [MessageId] | Parameters<MessageFunction>): string {
    const [source] = args;

    if (typeof source === 'object' && 'msgid' in source) {
      return this.getText(source);
    }

    return this.getText(msg(...args as Parameters<MessageFunction>));
  }

  pgettext(id: ContextMessageId): string;
  pgettext<T extends string>(context: string, id: StrictStaticString<T>): string;
  pgettext(context: string, descriptor: MessageDescriptor): string;
  pgettext(context: string, id: MessageId): string;
  pgettext(context: ContextMessageId | string, second?: string | MessageDescriptor | MessageId): string {
    if (typeof context === "object") {
      return this.getText(context.id, context.context);
    }

    if (typeof second === 'object' && 'msgid' in second) {
      return this.getText(second, context);
    }

    return this.getText(msg(second as MessageDescriptor), context);
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
      return this.getPluralText(source, context);
    }

    return this.getPluralText(plural(...args as Parameters<PluralFunction>), context);
  }
}
