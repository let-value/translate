import type { Locale, Translator } from "@let-value/translate";
import { createContext } from "react";

export const localeContext = createContext<Locale | undefined>(undefined);
export const translatorContext = createContext<Translator | undefined>(undefined);
