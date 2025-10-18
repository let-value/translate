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

function selectValues(message: Message | undefined, fallback?: Message): unknown[] | undefined {
    const values = message?.values;
    if (values?.length) {
        return values;
    }
    return fallback?.values;
}

function selectTemplate(preferred: string | undefined, fallback: string): string {
    return preferred?.length ? preferred : fallback;
}

function applyValues(template: string, message: Message | undefined, fallback?: Message): string {
    const values = selectValues(message, fallback);
    return values?.length ? substitute(template, values) : template;
}

function isPluralMessage(value: unknown): value is PluralMessage {
    return Boolean(value) && typeof value === "object" && "forms" in (value as PluralMessage);
}

function isContextMessage(value: unknown): value is ContextMessage {
    if (!value || typeof value !== "object" || !("id" in value)) {
        return false;
    }
    const candidate = (value as ContextMessage).id;
    return !isPluralMessage(candidate);
}

function isContextPluralMessage(value: unknown): value is ContextPluralMessage {
    if (!value || typeof value !== "object" || !("id" in value)) {
        return false;
    }
    const candidate = (value as ContextPluralMessage).id;
    return isPluralMessage(candidate);
}

type AnyTranslationMessage = Message | PluralMessage | ContextMessage | ContextPluralMessage;

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

    resolveMessage = (message: Message, context = ""): string => {
        const entry = this.translations?.translations?.[context]?.[message.msgid];
        const template = selectTemplate(entry?.msgstr?.[0], message.msgstr);
        return applyValues(template, message);
    };

    resolvePluralForm = (message: PluralMessage, context = ""): string => {
        const entry = this.translations?.translations?.[context]?.[message.forms[0].msgid];
        const index = pluralFunc(this.locale)(message.n);
        const forms = message.forms;
        const selectedForm = forms[index] ?? forms[forms.length - 1];
        const translatedForms = entry?.msgstr;
        const templateCandidate = translatedForms?.length
            ? (translatedForms[index] ?? translatedForms[translatedForms.length - 1])
            : undefined;
        const template = selectTemplate(templateCandidate, selectedForm.msgstr);
        return applyValues(template, selectedForm, forms[0]);
    };

    translateValue = (message: AnyTranslationMessage): string => {
        if (isContextPluralMessage(message)) {
            return this.resolvePluralForm(message.id, message.context);
        }

        if (isContextMessage(message)) {
            return this.resolveMessage(message.id, message.context);
        }

        if (isPluralMessage(message)) {
            return this.resolvePluralForm(message);
        }

        return this.resolveMessage(message);
    };

    translateMessage = <T extends string>(args: MessageArgs<T>, context?: string): string => {
        const message = buildMessage(...args);
        return this.resolveMessage(message, context);
    };

    translatePlural = (args: PluralArgs, context?: string): string => {
        const message = buildPlural(...args);
        return this.resolvePluralForm(message, context);
    };

    translate = (message: Message | PluralMessage | ContextMessage | ContextPluralMessage): string => {
        return this.translateValue(message);
    };

    message = <T extends string>(...args: MessageArgs<T>): string => this.translateMessage(args);
    plural = (...args: PluralArgs): string => this.translatePlural(args);

    context = <T extends string>(...args: [StrictStaticString<T>] | [TemplateStringsArray, ...never[]]) => {
        const [source] = args as [StrictStaticString<T> | TemplateStringsArray];

        const context = typeof source === "string" ? source : source[0];

        return {
            message: <U extends string>(...args: MessageArgs<U>): string => this.translateMessage(args, context),
            plural: (...args: PluralArgs): string => this.translatePlural(args, context),
        };
    };

    gettext = <T extends string>(...args: MessageArgs<T>): string => this.message(...args);
    ngettext = (...args: PluralArgs): string => this.plural(...args);
    pgettext = <C extends string, T extends string>(context: StrictStaticString<C>, ...args: MessageArgs<T>): string =>
        this.translateMessage(args, context);
    npgettext = <C extends string>(context: StrictStaticString<C>, ...args: PluralArgs): string =>
        this.translatePlural(args, context);
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

    loadLocale = async (locale: Locale, loader?: TranslationLoader): Promise<LocaleTranslator> => {
        this.loaders[locale] = loader ?? this.loaders[locale];

        return this.fetchLocale(locale as never);
    };

    getLocale = <L extends SyncLocaleKeys<T>>(locale: L): LocaleTranslator => {
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
            console.warn(
                `Translator.getLocale(${key}) called before async locale resolved. Returning untranslated fallback.`,
            );
            this.translators[key] ??= new LocaleTranslator(key);
            return this.translators[key];
        }

        this.translators[key] ??= new LocaleTranslator(key);
        return this.translators[key];
    };

    fetchLocale = <L extends keyof T>(locale: L) => {
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
    };
}
