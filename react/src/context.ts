import type { Locale, Translator } from "@let-value/translate";
import { createContext } from "react";

type AnyTranslator = Translator<any>;

export const localeContext = createContext<Locale | undefined>(undefined);
export const translatorContext = createContext<AnyTranslator | undefined>(undefined);
