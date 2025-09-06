import { use } from "react";
import { localeContext } from "../context.ts";

export function useLocale() {
    return use(localeContext);
}
