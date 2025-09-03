import type { GetTextTranslations } from "gettext-parser";
import {
    type ContextMessage,
    type ContextPluralMessage,
    type Message,
    type MessageArgs,
    type MessageInput,
    message as buildMessage,
    type PluralArgs,
    type PluralInput,
    type PluralMessage,
    plural as buildPlural,
} from "./messages.ts";
import { type StrictStaticString, pluralFunc, substitute } from "./utils.ts";

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | TranslationLoader;

type ContextMessageInput<T extends string> = [ContextMessage] | MessageInput<T>;
type ContextPluralInput = [ContextPluralMessage] | PluralInput;

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

    private translateMessage({ msgid, msgstr, values }: Message, msgctxt = ""): string {
        const translated = this.translations[this.locale]?.translations?.[msgctxt]?.[msgid];
        const result = translated?.msgstr ? translated.msgstr[0] : msgstr;
        return values ? substitute(result, values) : result;
    }

    private translatePlural({ forms, n }: PluralMessage, msgctxt = ""): string {
        const entry = this.translations[this.locale]?.translations?.[msgctxt]?.[forms[0].msgid];
        const index = pluralFunc(this.locale)(n);
        const form = forms[index] ?? forms[forms.length - 1];
        const translated = entry?.msgstr?.[index];
        const result = translated?.length ? translated : form.msgstr;
        const usedVals = form.values?.length ? form.values : forms[0].values;
        return usedVals?.length ? substitute(result, usedVals) : result;
    }

    message = <T extends string>(...args: MessageInput<T>): string => {
        const [source] = args;
        if (typeof source === "object" && "msgid" in source) {
            return this.translateMessage(source);
        }
        return this.translateMessage(buildMessage(...(args as MessageArgs<T>)));
    };

    plural = (...args: PluralInput): string => {
        const [source] = args;
        if (typeof source === "object" && "forms" in source) {
            return this.translatePlural(source);
        }
        return this.translatePlural(buildPlural(...(args as PluralArgs)));
    };

    context<T extends string>(context: StrictStaticString<T>): {
        message: <T extends string>(...args: ContextMessageInput<T>) => string;
        plural: (...args: ContextPluralInput) => string;
    };
    context(
        strings: TemplateStringsArray,
        ...values: never[]
    ): {
        message: <T extends string>(...args: ContextMessageInput<T>) => string;
        plural: (...args: ContextPluralInput) => string;
    };
    context<T extends string>(
        ...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]
    ) {
        const [source] = args as [StrictStaticString<T> | TemplateStringsArray];

        const ctx = typeof source === "string" ? source : source[0];

        return {
            message: <T extends string>(...args: ContextMessageInput<T>): string => {
                const [src] = args;
                if (typeof src === "object") {
                    if ("id" in src && "context" in src) {
                        return this.translateMessage(src.id, src.context);
                    }
                    if ("msgid" in src) {
                        return this.translateMessage(src, ctx);
                    }
                }
                return this.translateMessage(
                    buildMessage(...(args as MessageArgs<T>)),
                    ctx,
                );
            },
            plural: (...args: ContextPluralInput): string => {
                const [src] = args;
                if (typeof src === "object") {
                    if ("id" in src && "context" in src) {
                        return this.translatePlural(src.id, src.context);
                    }
                    if ("forms" in src) {
                        return this.translatePlural(src, ctx);
                    }
                }
                return this.translatePlural(buildPlural(...(args as PluralArgs)), ctx);
            },
        };
    }

    gettext<T extends string>(...args: MessageInput<T>): string {
        return this.message(...args);
    }

    ngettext(...args: PluralInput): string {
        return this.plural(...args);
    }

    pgettext<C extends string, T extends string>(
        context: ContextMessage | StrictStaticString<C>,
        ...args: MessageInput<T> | []
    ): string {
        if (typeof context === "object") {
            return this.translateMessage(context.id, context.context);
        }
        return this.context(context).message(...(args as ContextMessageInput<T>));
    }

    npgettext<C extends string>(
        context: ContextPluralMessage | StrictStaticString<C>,
        ...args: PluralInput | []
    ): string {
        if (typeof context === "object") {
            return this.translatePlural(context.id, context.context);
        }
        return this.context(context).plural(...(args as ContextPluralInput));
    }
}
