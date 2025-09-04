import type { GetTextTranslation } from "gettext-parser";
import type Parser from "tree-sitter";
import { extractMessage } from "./message.ts";
import type { MessageMatch } from "./types.ts";
import { isDescendant } from "./utils.ts";

export const extractPluralForms =
    (name: string) =>
    (match: Parser.QueryMatch): MessageMatch | undefined => {
        const call = match.captures.find((c) => c.name === "call")?.node;
        if (!call) {
            return undefined;
        }

        const msgctxt = match.captures.find((c) => c.name === "msgctxt")?.node?.text;
        const msgNodes = match.captures.filter((c) => c.name === "msg").map((c) => c.node);

        const ids: string[] = [];
        const strs: string[] = [];

        for (const node of msgNodes) {
            const relevant = match.captures.filter(
                (c) => ["msgid", "id", "message", "tpl"].includes(c.name) && isDescendant(c.node, node),
            );

            const subMatch: Parser.QueryMatch = {
                pattern: 0,
                captures: [{ name: "call", node }, ...relevant],
            };

            const result = extractMessage(name)(subMatch);
            if (!result) continue;
            if (result.error) {
                return { node: call, error: result.error };
            }
            if (result.translation) {
                ids.push(result.translation.msgid);
                strs.push(result.translation.msgstr[0] ?? "");
            }
        }

        if (ids.length === 0) {
            return undefined;
        }

        const translation: GetTextTranslation = {
            msgid: ids[0],
            msgid_plural: ids[1],
            msgstr: strs,
        };
        if (msgctxt) translation.msgctxt = msgctxt;

        return { node: call, translation };
    };
