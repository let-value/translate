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

type Translation = NonNullable<GetTextTranslations["translations"]>[string][string];

function selectTranslation(
    translations: GetTextTranslations | undefined,
    context: string,
    msgid: string,
): Translation | undefined {
    return translations?.translations?.[context]?.[msgid];
}

type DeferredGuard = (value: unknown) => boolean;

function translateDeferred(
    locale: Locale,
    translations: GetTextTranslations | undefined,
    source: unknown,
    method: string,
    guards: DeferredGuard[],
    context?: string,
): string | undefined {
    if (!guards.some((guard) => guard(source))) {
        return undefined;
    }

    console.warn(
        `LocaleTranslator.${method} received a deferred message. Falling back to translate() semantics.`,
    );

    const message = source as AnyTranslationMessage;

    if (context !== undefined) {
        if (isPluralMessage(message)) {
            return translateValue(locale, translations, { context, id: message });
        }
        if (isMessage(message)) {
            return translateValue(locale, translations, { context, id: message });
        }
    }

    return translateValue(locale, translations, message);
}

function selectValues(message: Message | undefined, fallback?: Message): unknown[] | undefined {
    const values = message?.values;
    if (values && values.length) {
        return values;
    }
    return fallback?.values;
}

function selectTemplate(preferred: string | undefined, fallback: string): string {
    return preferred && preferred.length ? preferred : fallback;
}

function applyValues(template: string, message: Message | undefined, fallback?: Message): string {
    const values = selectValues(message, fallback);
    return values && values.length ? substitute(template, values) : template;
}

function resolveMessage(
    translations: GetTextTranslations | undefined,
    message: Message,
    context = "",
): string {
    const entry = selectTranslation(translations, context, message.msgid);
    const template = selectTemplate(entry?.msgstr?.[0], message.msgstr);
    return applyValues(template, message);
}

function resolvePluralForm(
    locale: Locale,
    message: PluralMessage,
    entry: Translation | undefined,
): string {
    const index = pluralFunc(locale)(message.n);
    const forms = message.forms;
    const selectedForm = forms[index] ?? forms[forms.length - 1];
    const translatedForms = entry?.msgstr;
    const templateCandidate =
        translatedForms && translatedForms.length
            ? translatedForms[index] ?? translatedForms[translatedForms.length - 1]
            : undefined;
    const template = selectTemplate(templateCandidate, selectedForm.msgstr);
    return applyValues(template, selectedForm, forms[0]);
}

function isMessage(value: unknown): value is Message {
    return Boolean(value) && typeof value === "object" && "msgid" in (value as Message);
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

function translateMessageValue(
    translations: GetTextTranslations | undefined,
    message: Message,
    context = "",
): string {
    return resolveMessage(translations, message, context);
}

function translatePluralValue(
    locale: Locale,
    translations: GetTextTranslations | undefined,
    message: PluralMessage,
    context = "",
): string {
    const entry = selectTranslation(translations, context, message.forms[0]!.msgid);
    return resolvePluralForm(locale, message, entry);
}

type AnyTranslationMessage = Message | PluralMessage | ContextMessage | ContextPluralMessage;

function translateValue(
    locale: Locale,
    translations: GetTextTranslations | undefined,
    message: AnyTranslationMessage,
): string {
    if (isContextPluralMessage(message)) {
        return translatePluralValue(locale, translations, message.id, message.context);
    }

    if (isContextMessage(message)) {
        return translateMessageValue(translations, message.id, message.context);
    }

    if (isPluralMessage(message)) {
        return translatePluralValue(locale, translations, message);
    }

    return translateMessageValue(translations, message);
}

function translateMessageArgs<T extends string>(
    locale: Locale,
    translations: GetTextTranslations | undefined,
    args: MessageArgs<T>,
    method: string,
    guards: DeferredGuard[],
    context?: string,
): string {
    const [source] = args as [unknown];

    const deferred = translateDeferred(locale, translations, source, method, guards, context);
    if (deferred !== undefined) {
        return deferred;
    }

    const message = buildMessage(...args);
    return translateValue(
        locale,
        translations,
        context !== undefined ? { context, id: message } : message,
    );
}

function translatePluralArgs(
    locale: Locale,
    translations: GetTextTranslations | undefined,
    args: PluralArgs,
    method: string,
    guards: DeferredGuard[],
    context?: string,
): string {
    const [source] = args as [unknown];

    const deferred = translateDeferred(locale, translations, source, method, guards, context);
    if (deferred !== undefined) {
        return deferred;
    }

    const message = buildPlural(...args);
    return translateValue(
        locale,
        translations,
        context !== undefined ? { context, id: message } : message,
    );
}

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

    message = <T extends string>(...args: MessageArgs<T>): string => {
        return translateMessageArgs(this.locale, this.translations, args, "message", [isMessage]);
    };

    translate(message: Message): string;
    translate(message: PluralMessage): string;
    translate(message: ContextMessage): string;
    translate(message: ContextPluralMessage): string;
    translate(message: Message | PluralMessage | ContextMessage | ContextPluralMessage): string {
        return translateValue(this.locale, this.translations, message);
    }

    plural = (...args: PluralArgs): string => {
        return translatePluralArgs(this.locale, this.translations, args, "plural", [isPluralMessage]);
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
                return translateMessageArgs(
                    this.locale,
                    this.translations,
                    args,
                    "context().message",
                    [isMessage, isContextMessage],
                    ctx,
                );
            },
            plural: (...args: PluralArgs): string => {
                return translatePluralArgs(
                    this.locale,
                    this.translations,
                    args,
                    "context().plural",
                    [isPluralMessage, isContextPluralMessage],
                    ctx,
                );
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
            return translateValue(this.locale, this.translations, context);
        }
        return translateMessageArgs(
            this.locale,
            this.translations,
            args as MessageArgs<T>,
            "pgettext",
            [isMessage, isContextMessage],
            context,
        );
    }

    npgettext<C extends string>(
        context: ContextPluralMessage | StrictStaticString<C>,
        ...args: PluralArgs | []
    ): string {
        if (typeof context === "object") {
            return translateValue(this.locale, this.translations, context);
        }
        return translatePluralArgs(
            this.locale,
            this.translations,
            args as PluralArgs,
            "npgettext",
            [isPluralMessage, isContextPluralMessage],
            context,
        );
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
            console.warn(
                `Translator.getLocale(${key}) called before async locale resolved. Returning untranslated fallback.`,
            );
            this.translators[key] ??= new LocaleTranslator(key);
            return this.translators[key];
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
