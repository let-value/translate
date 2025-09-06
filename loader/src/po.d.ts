declare module "*.po" {
    const content: import("gettext-parser").GetTextTranslations;
    export default content;
}
