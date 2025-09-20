import type { GetTextTranslations } from "gettext-parser";
import type { Locale } from "./config.ts";

import {
    message as buildMessage,
    plural as buildPlural,
    type ContextMessage,
    type ContextPluralMessage,
    type Message,
    type MessageArgs,
    type PluralArgs,
    type PluralMessage,
} from "./messages.ts";
import { mergeTranslations, normalizeTranslations, pluralFunc, type StrictStaticString, substitute } from "./utils.ts";

type TranslationModule = GetTextTranslations | { default: GetTextTranslations };
type TranslationLoader = () => Promise<TranslationModule>;
type TranslationEntry = TranslationModule | Promise<TranslationModule> | TranslationLoader;
type TranslationRecord = Partial<Record<Locale, TranslationEntry>>;
type SyncLocaleKeys<T> = {
    [K in keyof T]: T[K] extends GetTextTranslations ? K : never;
}[keyof T];

function resolveTranslationModule(module: TranslationModule): GetTextTranslations {
    return "default" in module ? module.default : module;
}

export class LocaleTranslator {
    locale: Locale;
    translations?: GetTextTranslations;

    constructor(locale: Locale, translations?: GetTextTranslations) {
        this.locale = locale;
        this.translations = translations ? normalizeTranslations(translations) : undefined;
    }

    private translateMessage({ msgid, msgstr, values }: Message, msgctxt = ""): string {
        const translated = this.translations?.translations?.[msgctxt]?.[msgid];
        const result = translated?.msgstr?.[0] || msgstr;
        return values ? substitute(result, values) : result;
    }

    private translatePlural({ forms, n }: PluralMessage, msgctxt = ""): string {
        const entry = this.translations?.translations?.[msgctxt]?.[forms[0].msgid];
        const index = pluralFunc(this.locale)(n);
        const form = forms[index] ?? forms[forms.length - 1];
        const translated = entry?.msgstr ? (entry.msgstr[index] ?? entry.msgstr[entry.msgstr.length - 1]) : undefined;
        const result = translated || form.msgstr;
        const usedVals = form.values?.length ? form.values : forms[0].values;
        return usedVals?.length ? substitute(result, usedVals) : result;
    }

    message = <T extends string>(...args: MessageArgs<T>): string => {
        return this.translateMessage(buildMessage(...args));
    };

    translate(message: Message): string;
    translate(message: PluralMessage): string;
    translate(message: ContextMessage): string;
    translate(message: ContextPluralMessage): string;
    translate(message: Message | PluralMessage | ContextMessage | ContextPluralMessage): string {
        if ("context" in message) {
            if ("forms" in message.id) {
                return this.translatePlural(message.id, message.context);
            }
            return this.translateMessage(message.id, message.context);
        }

        if ("forms" in message) {
            return this.translatePlural(message);
        }

        return this.translateMessage(message);
    }

    plural = (...args: PluralArgs): string => {
        return this.translatePlural(buildPlural(...args));
    };

    context<T extends string>(
        context: StrictStaticString<T>,
    ): {
        message: <U extends string>(...args: MessageArgs<U>) => string;
        plural: (...args: PluralArgs) => string;
    };
    context(
        strings: TemplateStringsArray,
        ...values: never[]
    ): {
        message: <U extends string>(...args: MessageArgs<U>) => string;
        plural: (...args: PluralArgs) => string;
    };
    context<T extends string>(...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]) {
        const [source] = args as [StrictStaticString<T> | TemplateStringsArray];

        const ctx = typeof source === "string" ? source : source[0];

        return {
            message: <U extends string>(...args: MessageArgs<U>): string => {
                return this.translateMessage(buildMessage(...args), ctx);
            },
            plural: (...args: PluralArgs): string => {
                return this.translatePlural(buildPlural(...args), ctx);
            },
        };
    }

    gettext<T extends string>(...args: MessageArgs<T>): string {
        return this.message(...args);
    }

    ngettext(...args: PluralArgs): string {
        return this.plural(...args);
    }

    pgettext<C extends string, T extends string>(
        context: ContextMessage | StrictStaticString<C>,
        ...args: MessageArgs<T> | []
    ): string {
        if (typeof context === "object") {
            return this.translateMessage(context.id, context.context);
        }
        return this.context(context).message(...(args as MessageArgs<T>));
    }

    npgettext<C extends string>(
        context: ContextPluralMessage | StrictStaticString<C>,
        ...args: PluralArgs | []
    ): string {
        if (typeof context === "object") {
            return this.translatePlural(context.id, context.context);
        }
        return this.context(context).plural(...(args as PluralArgs));
    }
}

export class Translator<T extends TranslationRecord = TranslationRecord> {
    parent: Translator | undefined;
    loaders: Partial<Record<Locale, TranslationLoader>> = {};
    translations: Partial<Record<Locale, GetTextTranslations>> = {};
    pending: Partial<Record<Locale, Promise<LocaleTranslator>>> = {};
    translators: Partial<Record<Locale, LocaleTranslator>> = {};

    constructor(translations: T, parent?: Translator) {
        this.parent = parent;
        for (const [locale, value] of Object.entries(translations) as [Locale, TranslationEntry][]) {
            if (!value) continue;
            if (typeof value === "function") {
                this.loaders[locale] = value;
            } else if ("then" in value) {
                this.loaders[locale] = () => value;
            } else {
                this.translations[locale] = resolveTranslationModule(value);
            }
        }
    }

    async loadLocale(locale: Locale, loader?: TranslationLoader): Promise<LocaleTranslator> {
        this.loaders[locale] = loader ?? this.loaders[locale];

        return this.fetchLocale(locale as never);
    }

    getLocale<L extends SyncLocaleKeys<T>>(locale: L): LocaleTranslator {
        const key = locale as Locale;
        const existing = this.translators[key];
        if (existing) {
            return existing;
        }

        const base = this.translations[key];
        if (base) {
            const parentTranslations = this.parent?.getLocale(locale as never)?.translations;
            const translations = mergeTranslations(base, parentTranslations);
            delete this.translations[key];

            const translator = new LocaleTranslator(key, translations);
            this.translators[key] = translator;
            return translator;
        }

        if (this.pending[key] || this.loaders[key]) {
            throw new Error("async locale cannot be loaded synchronously");
        }

        this.translators[key] ??= new LocaleTranslator(key);
        return this.translators[key];
    }

    fetchLocale<L extends keyof T>(locale: L) {
        const key = locale as Locale;

        const pending = this.pending[key];
        if (pending) {
            return pending;
        }

        const loader = this.loaders[key];
        if (loader) {
            const promise = loader().then((translations) => {
                this.translations[key] ??= resolveTranslationModule(translations);
                delete this.pending[key];

                return this.getLocale(key as never);
            });
            this.pending[key] = promise;
            delete this.loaders[key];

            return promise;
        }

        return this.getLocale(key as never);
    }
}
