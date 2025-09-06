import type { GetTextTranslations } from "gettext-parser";
import { assign } from "radash";

import {
    message as buildMessage,
    plural as buildPlural,
    type ContextMessage,
    type ContextPluralMessage,
    type Message,
    type MessageArgs,
    type MessageInput,
    type PluralArgs,
    type PluralInput,
    type PluralMessage,
} from "./messages.ts";
import { pluralFunc, type StrictStaticString, substitute } from "./utils.ts";

type TranslationLoader = () => Promise<GetTextTranslations>;
type TranslationEntry = GetTextTranslations | Promise<GetTextTranslations> | TranslationLoader;
type SyncLocaleKeys<T> = {
    [K in keyof T]: T[K] extends GetTextTranslations ? K : never;
}[keyof T];

type ContextMessageInput<T extends string> = [ContextMessage] | MessageInput<T>;
type ContextPluralInput = [ContextPluralMessage] | PluralInput;

export class LocaleTranslator {
    locale: string;
    translations?: GetTextTranslations;

    constructor(locale: string, translations?: GetTextTranslations) {
        this.locale = locale;
        this.translations = translations;
    }

    private translateMessage({ msgid, msgstr, values }: Message, msgctxt = ""): string {
        const translated = this.translations?.translations?.[msgctxt]?.[msgid];
        const result = translated?.msgstr ? translated.msgstr[0] : msgstr;
        return values ? substitute(result, values) : result;
    }

    private translatePlural({ forms, n }: PluralMessage, msgctxt = ""): string {
        const entry = this.translations?.translations?.[msgctxt]?.[forms[0].msgid];
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

    context<T extends string>(
        context: StrictStaticString<T>,
    ): {
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
    context<T extends string>(...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]) {
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
                return this.translateMessage(buildMessage(...(args as MessageArgs<T>)), ctx);
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

export class Translator<T extends Record<string, TranslationEntry> = Record<string, TranslationEntry>> {
    parent: Translator | undefined;
    loaders: Partial<Record<string, TranslationLoader>> = {};
    translations: Partial<Record<string, GetTextTranslations>> = {};
    translators: Partial<Record<string, LocaleTranslator>> = {};
    pending: Partial<Record<string, Promise<LocaleTranslator>>> = {};

    constructor(translations: T, parent?: Translator) {
        this.parent = parent;
        for (const [locale, value] of Object.entries(translations)) {
            if (typeof value === "function") {
                this.loaders[locale] = value;
            } else if ("then" in value) {
                this.loaders[locale] = () => value;
            } else {
                this.translations[locale] = value;
            }
        }
    }

    async loadLocale(locale: string, loader?: TranslationLoader): Promise<LocaleTranslator> {
        this.loaders[locale] = loader ?? this.loaders[locale];

        return this.fetchLocale(locale);
    }

    getLocale<L extends SyncLocaleKeys<T>>(locale: L): LocaleTranslator {
        const key = locale as string;
        if (this.translators[key]) {
            return this.translators[key];
        }

        if (this.translations[key]) {
            const parent = this.parent?.getLocale(locale as never)?.translations;

            const translations = assign<GetTextTranslations>(this.translations[key], parent as never);
            delete this.translations[key];

            this.translators[key] = new LocaleTranslator(key, translations);
            return this.translators[key];
        }

        if (this.pending[key] || this.loaders[key]) {
            throw new Error("async locale cannot be loaded synchronously");
        }

        this.translators[key] ??= new LocaleTranslator(key);
        return this.translators[key];
    }

    fetchLocale<L extends keyof T>(locale: L) {
        const key = locale as string;

        if (this.pending[key]) {
            return this.pending[key];
        }

        if (this.loaders[key]) {
            this.pending[key] = this.loaders[key]().then((translations) => {
                this.translations[key] ??= translations;
                delete this.loaders[key];
                delete this.pending[key];

                return this.getLocale(key as never);
            });

            return this.pending[key];
        }

        return this.getLocale(key as never);
    }
}
