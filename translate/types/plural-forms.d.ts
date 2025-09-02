declare module "plural-forms" {
    export declare function getFormula(language: string): string;
    export declare function getNPlurals(language: string): number;
    export declare function getPluralFunc(
        language: string,
    ): (plural: number, wordForms: string[]) => string | undefined;
    export declare function hasLang(language: string): boolean;
    export declare function getPluralFormsHeader(language: string): string;
    export declare function getAvailLangs(): string[];
    export declare function getExamples(language: string): Array<{ plural: number; sample: number }>;
}
