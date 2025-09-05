import type { Translator } from "@let-value/translate";
import type { GetTextTranslations } from "gettext-parser";
import { useContext } from "react";

import { TranslatorContext } from "./TranslationsProvider.tsx";

export function useTranslations(locale?: string): Translator {
    const translator = useContext(TranslatorContext);
    if (!translator) {
        throw new Error("TranslationsProvider is missing");
    }

    if (locale) {
        const internal = translator as unknown as {
            locale: string;
            translations: Record<string, GetTextTranslations>;
        };
        if (internal.locale !== locale || !internal.translations[locale]) {
            // biome-ignore lint/correctness/useHookAtTopLevel: Suspense integration
            throw translator.useLocale(locale);
        }
    }

    return translator;
}
