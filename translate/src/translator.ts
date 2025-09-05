import type { GetTextTranslations } from "gettext-parser";
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
type TranslationEntry =
    | GetTextTranslations
    | Promise<GetTextTranslations>
    | TranslationLoader;
type SyncLocaleKeys<T> = {
    [K in keyof T]: T[K] extends GetTextTranslations ? K : never;
}[keyof T];

type ContextMessageInput<T extends string> = [ContextMessage] | MessageInput<T>;
type ContextPluralInput = [ContextPluralMessage] | PluralInput;

export class Translator<
    T extends Record<string, TranslationEntry> = Record<string, TranslationEntry>,
> {
    private locale: string;
    private translations: Partial<Record<keyof T, GetTextTranslations>> = {};
    private loaders: Partial<Record<keyof T, TranslationLoader>> = {};

    constructor(defaultLocale: string, translations: T) {
        this.locale = defaultLocale;
        for (const [locale, value] of Object.entries(translations) as [keyof T, TranslationEntry][]) {
            if (typeof value === "function") {
                this.loaders[locale] = value as TranslationLoader;
            } else if (value && typeof (value as Promise<GetTextTranslations>).then === "function") {
                this.loaders[locale] = () => value as Promise<GetTextTranslations>;
            } else {
                this.translations[locale] = value as GetTextTranslations;
            }
        }
    }

    async load(locale: keyof T | string, loader?: TranslationLoader): Promise<void> {
        const key = locale as keyof T;
        if (!this.translations[key]) {
            const fn = loader ?? this.loaders[key];
            if (fn) {
                this.translations[key] = await fn();
                delete this.loaders[key];
            }
        }
    }

    async useLocale(locale: keyof T | string): Promise<void> {
        await this.load(locale);
        this.locale = locale as string;
    }

    _translateMessage(locale: string, { msgid, msgstr, values }: Message, msgctxt = ""): string {
        const translated = this.translations[locale as keyof T]?.translations?.[msgctxt]?.[msgid];
        const result = translated?.msgstr ? translated.msgstr[0] : msgstr;
        return values ? substitute(result, values) : result;
    }

    _translatePlural(locale: string, { forms, n }: PluralMessage, msgctxt = ""): string {
        const entry = this.translations[locale as keyof T]?.translations?.[msgctxt]?.[forms[0].msgid];
        const index = pluralFunc(locale)(n);
        const form = forms[index] ?? forms[forms.length - 1];
        const translated = entry?.msgstr?.[index];
        const result = translated?.length ? translated : form.msgstr;
        const usedVals = form.values?.length ? form.values : forms[0].values;
        return usedVals?.length ? substitute(result, usedVals) : result;
    }

    private translateMessage(message: Message, msgctxt = ""): string {
        return this._translateMessage(this.locale, message, msgctxt);
    }

    private translatePlural(message: PluralMessage, msgctxt = ""): string {
        return this._translatePlural(this.locale, message, msgctxt);
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

    getLocale<L extends SyncLocaleKeys<T>>(locale: L): LocaleTranslator {
        if (!this.translations[locale]) {
            throw new Error("async locale cannot be loaded synchronously");
        }
        return new LocaleTranslator(this, locale as string);
    }

    async fetchLocale<L extends keyof T>(locale: L): Promise<LocaleTranslator> {
        await this.load(locale);
        return new LocaleTranslator(this, locale as string);
    }

    async loadLocale<L extends keyof T>(locale: L): Promise<void> {
        await this.load(locale);
    }
}

export class LocaleTranslator {
    private base: Translator<any>;
    private locale: string;

    constructor(base: Translator<any>, locale: string) {
        this.base = base;
        this.locale = locale;
    }

    message = <T extends string>(...args: MessageInput<T>): string => {
        const [source] = args;
        if (typeof source === "object" && "msgid" in source) {
            return this.base._translateMessage(this.locale, source);
        }
        return this.base._translateMessage(
            this.locale,
            buildMessage(...(args as MessageArgs<T>)),
        );
    };

    plural = (...args: PluralInput): string => {
        const [source] = args;
        if (typeof source === "object" && "forms" in source) {
            return this.base._translatePlural(this.locale, source);
        }
        return this.base._translatePlural(
            this.locale,
            buildPlural(...(args as PluralArgs)),
        );
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
    context<T extends string>(
        ...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]
    ) {
        const [source] = args as [StrictStaticString<T> | TemplateStringsArray];

        const ctx = typeof source === "string" ? source : source[0];
        const locale = this.locale;

        return {
            message: <T extends string>(...args: ContextMessageInput<T>): string => {
                const [src] = args;
                if (typeof src === "object") {
                    if ("id" in src && "context" in src) {
                        return this.base._translateMessage(locale, src.id, src.context);
                    }
                    if ("msgid" in src) {
                        return this.base._translateMessage(locale, src, ctx);
                    }
                }
                return this.base._translateMessage(
                    locale,
                    buildMessage(...(args as MessageArgs<T>)),
                    ctx,
                );
            },
            plural: (...args: ContextPluralInput): string => {
                const [src] = args;
                if (typeof src === "object") {
                    if ("id" in src && "context" in src) {
                        return this.base._translatePlural(locale, src.id, src.context);
                    }
                    if ("forms" in src) {
                        return this.base._translatePlural(locale, src, ctx);
                    }
                }
                return this.base._translatePlural(
                    locale,
                    buildPlural(...(args as PluralArgs)),
                    ctx,
                );
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
            return this.base._translateMessage(
                this.locale,
                context.id,
                context.context,
            );
        }
        return this.context(context).message(...(args as ContextMessageInput<T>));
    }

    npgettext<C extends string>(
        context: ContextPluralMessage | StrictStaticString<C>,
        ...args: PluralInput | []
    ): string {
        if (typeof context === "object") {
            return this.base._translatePlural(
                this.locale,
                context.id,
                context.context,
            );
        }
        return this.context(context).plural(...(args as ContextPluralInput));
    }
}
