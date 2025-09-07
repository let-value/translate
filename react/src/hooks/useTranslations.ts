import type { LocaleTranslator } from "@let-value/translate";
import { use } from "react";

import { localeContext, translatorContext } from "../context.ts";

/** @deprecated replace with `use` from react */
// biome-ignore lint/suspicious/noExplicitAny: we need to decorate the promise
function getPromiseState(promise: any) {
    switch (promise.status) {
        case "pending":
            return { status: "pending" };
        case "fulfilled":
            return { status: "fulfilled", value: promise.value };
        case "rejected":
            return { status: "rejected", reason: promise.reason };
        default: {
            promise.status = "pending";
            promise.then((value: unknown) => {
                promise.status = "fulfilled";
                promise.value = value;
            });
            promise.catch((reason: unknown) => {
                promise.status = "rejected";
                promise.reason = reason;
            });
            return getPromiseState(promise);
        }
    }
}

export function useTranslations(locale?: string): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? "unknown";
    const translator = use(translatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    const resource = translator.fetchLocale(requestedLocale);
    if (!(resource instanceof Promise)) {
        return resource;
    }

    const state = getPromiseState(resource);
    if (state.status === "pending") {
        throw resource;
    }
    if (state.status === "rejected") {
        throw state.reason;
    }
    if (state.status === "fulfilled") {
        return state.value;
    }

    return use(resource);
}
