import type { Locale, LocaleTranslator } from "@let-value/translate";
import { use } from "react";

import { dehydrationContext, localeContext, translatorContext } from "../context.ts";
import { seedFromDocument } from "../dehydration.ts";

/** @deprecated replace with `use` from react */
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

export function useTranslations(locale?: Locale): LocaleTranslator {
    const requestedLocale = locale ?? use(localeContext) ?? ("unknown" as never);
    const translator = use(translatorContext);
    const dehydrated = use(dehydrationContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    // Seed before `fetchLocale`, so a catalog the server already inlined never
    // starts its loader — the chunk is not fetched and this render does not
    // suspend, which is what lets React keep the server markup.
    seedFromDocument(dehydrated, requestedLocale);

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
