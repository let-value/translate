declare module "plural-forms" {
    export type PluralFormsLocale =
        | "ach"
        | "af"
        | "ak"
        | "am"
        | "an"
        | "ar"
        | "arn"
        | "ast"
        | "ay"
        | "az"
        | "be"
        | "bg"
        | "bn"
        | "bo"
        | "br"
        | "brx"
        | "bs"
        | "ca"
        | "cgg"
        | "cs"
        | "csb"
        | "cy"
        | "da"
        | "de"
        | "doi"
        | "dz"
        | "el"
        | "en"
        | "eo"
        | "es"
        | "et"
        | "eu"
        | "fa"
        | "ff"
        | "fi"
        | "fil"
        | "fo"
        | "fr"
        | "fur"
        | "fy"
        | "ga"
        | "gd"
        | "gl"
        | "gu"
        | "gun"
        | "ha"
        | "he"
        | "hi"
        | "hne"
        | "hr"
        | "hu"
        | "hy"
        | "id"
        | "is"
        | "it"
        | "ja"
        | "jbo"
        | "jv"
        | "ka"
        | "kab"
        | "kk"
        | "km"
        | "kn"
        | "ko"
        | "ku"
        | "kw"
        | "ky"
        | "lb"
        | "ln"
        | "lo"
        | "lt"
        | "lv"
        | "mai"
        | "mfe"
        | "mg"
        | "mi"
        | "mk"
        | "ml"
        | "mn"
        | "mni"
        | "mnk"
        | "mr"
        | "ms"
        | "mt"
        | "my"
        | "nah"
        | "nap"
        | "nb"
        | "ne"
        | "nl"
        | "nn"
        | "no"
        | "nso"
        | "oc"
        | "or"
        | "pa"
        | "pap"
        | "pl"
        | "pms"
        | "ps"
        | "pt"
        | "rm"
        | "ro"
        | "ru"
        | "rw"
        | "sah"
        | "sat"
        | "sco"
        | "sd"
        | "se"
        | "si"
        | "sk"
        | "sl"
        | "so"
        | "son"
        | "sq"
        | "sr"
        | "su"
        | "sv"
        | "sw"
        | "ta"
        | "te"
        | "tg"
        | "th"
        | "ti"
        | "tk"
        | "tr"
        | "tt"
        | "ug"
        | "uk"
        | "ur"
        | "uz"
        | "vi"
        | "wa"
        | "wo"
        | "yo"
        | "zh";
    export const locales: readonly [
        "ach",
        "af",
        "ak",
        "am",
        "an",
        "ar",
        "arn",
        "ast",
        "ay",
        "az",
        "be",
        "bg",
        "bn",
        "bo",
        "br",
        "brx",
        "bs",
        "ca",
        "cgg",
        "cs",
        "csb",
        "cy",
        "da",
        "de",
        "doi",
        "dz",
        "el",
        "en",
        "eo",
        "es",
        "et",
        "eu",
        "fa",
        "ff",
        "fi",
        "fil",
        "fo",
        "fr",
        "fur",
        "fy",
        "ga",
        "gd",
        "gl",
        "gu",
        "gun",
        "ha",
        "he",
        "hi",
        "hne",
        "hr",
        "hu",
        "hy",
        "id",
        "is",
        "it",
        "ja",
        "jbo",
        "jv",
        "ka",
        "kab",
        "kk",
        "km",
        "kn",
        "ko",
        "ku",
        "kw",
        "ky",
        "lb",
        "ln",
        "lo",
        "lt",
        "lv",
        "mai",
        "mfe",
        "mg",
        "mi",
        "mk",
        "ml",
        "mn",
        "mni",
        "mnk",
        "mr",
        "ms",
        "mt",
        "my",
        "nah",
        "nap",
        "nb",
        "ne",
        "nl",
        "nn",
        "no",
        "nso",
        "oc",
        "or",
        "pa",
        "pap",
        "pl",
        "pms",
        "ps",
        "pt",
        "rm",
        "ro",
        "ru",
        "rw",
        "sah",
        "sat",
        "sco",
        "sd",
        "se",
        "si",
        "sk",
        "sl",
        "so",
        "son",
        "sq",
        "sr",
        "su",
        "sv",
        "sw",
        "ta",
        "te",
        "tg",
        "th",
        "ti",
        "tk",
        "tr",
        "tt",
        "ug",
        "uk",
        "ur",
        "uz",
        "vi",
        "wa",
        "wo",
        "yo",
        "zh",
    ];
    export declare function getFormula(language: string): string;
    export declare function getNPlurals(language: string): number;
    export declare function getPluralFunc(
        language: string,
    ): (plural: number, wordForms: string[]) => string | undefined;
    export declare function hasLang(language: string): boolean;
    export declare function getPluralFormsHeader(language: string): string;
    export declare function getAvailLangs(): PluralFormsLocale[];
    export declare function getExamples(language: string): Array<{ plural: number; sample: number }>;
}
