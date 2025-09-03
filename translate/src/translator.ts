import type { GetTextTranslations } from "gettext-parser";
import {
    type ContextMessageId,
    type ContextPluralMessageId,
    type MessageDescriptor,
    type MessageArgs,
    type MessageId,
    type MessageInit,
    msg,
    type PluralArgs,
    type PluralMessageId,
    type PluralInit,
    plural,
} from "./helpers.ts";
import { pluralFunc, substitute } from "./utils.ts";

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | TranslationLoader;

export class Translator {
    private locale: string;
    private translations: Record<string, GetTextTranslations> = {};
    private loaders: Record<string, TranslationLoader> = {};

    constructor(defaultLocale: string, translations: Record<string, TranslationEntry>) {
        this.locale = defaultLocale;
        for (const [locale, value] of Object.entries(translations)) {
            if (typeof value === "function") {
                this.loaders[locale] = value as TranslationLoader;
            } else {
                this.translations[locale] = value;
            }
        }
    }

    msg = msg;
    plural = plural;

    async load(locale: string, loader?: TranslationLoader): Promise<void> {
        if (!this.translations[locale]) {
            const fn = loader ?? this.loaders[locale];
            if (fn) {
                this.translations[locale] = await fn();
                delete this.loaders[locale];
            }
        }
    }

    async useLocale(locale: string): Promise<void> {
        await this.load(locale);
        this.locale = locale;
    }

    getText({ msgid, msgstr, values }: MessageId, msgctxt = ""): string {
        const translated = this.translations[this.locale]?.translations?.[msgctxt]?.[msgid];
        const result = translated?.msgstr ? translated.msgstr[0] : msgstr;
        return values ? substitute(result, values) : result;
    }

    getPluralText({ forms, n }: PluralMessageId, msgctxt = ""): string {
        const entry = this.translations[this.locale]?.translations?.[msgctxt]?.[forms[0].msgid];
        const index = pluralFunc(this.locale)(n);
        const form = forms[index] ?? forms[forms.length - 1];
        const translated = entry?.msgstr?.[index];
        const result = translated?.length ? translated : form.msgstr;
        const usedVals = form.values?.length ? form.values : forms[0].values;
        return usedVals?.length ? substitute(result, usedVals) : result;
    }

    gettext<T extends string>(...args: MessageInit<T>): string {
        const [source] = args;

        if (typeof source === "object" && "msgid" in source) {
            return this.getText(source);
        }

        return this.getText(msg(...(args as MessageArgs<T>)));
    }

    pgettext<T extends string>(
        context: ContextMessageId | string,
        ...args: MessageInit<T> | []
    ): string {
        if (typeof context === "object") {
            return this.getText(context.id, context.context);
        }

        const [second] = args;

        if (typeof second === "object" && "msgid" in second) {
            return this.getText(second, context);
        }

        return this.getText(msg(...(args as MessageArgs<T>)), context);
    }

    ngettext(...args: PluralInit): string {
        const [source] = args;

        if (typeof source === "object" && "forms" in source) {
            return this.getPluralText(source);
        }

        return this.getPluralText(plural(...(args as PluralArgs)));
    }

    npgettext(
        context: ContextPluralMessageId | string,
        ...args: PluralInit | []
    ): string {
        if (typeof context === "object") {
            return this.getPluralText(context.id, context.context);
        }

        const [source] = args;

        if (typeof source === "object" && "forms" in source) {
            return this.getPluralText(source, context);
        }

        return this.getPluralText(plural(...(args as PluralArgs)), context);
    }
}
