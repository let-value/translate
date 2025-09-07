import type { Locale } from "@let-value/translate";
import { use } from "react";
import { localeContext } from "../context.ts";

export function useLocale(): Locale | undefined {
    return use(localeContext);
}
