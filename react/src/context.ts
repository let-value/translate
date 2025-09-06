import type { Translator } from "@let-value/translate";
import { createContext } from "react";

export const localeContext = createContext<string | undefined>(undefined);
export const translatorContext = createContext<Translator | undefined>(undefined);
