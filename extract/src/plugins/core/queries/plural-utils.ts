import type Parser from "@keqingmoe/tree-sitter";
import { extractMessage } from "./message.ts";
import type { MessageMatch, Translation } from "./types.ts";
import { isDescendant } from "./utils.ts";

export const extractPluralForms =
    (name: string) =>
    (match: Parser.QueryMatch): MessageMatch | undefined => {
        const call = match.captures.find((c) => c.name === "call")?.node;
        const n = match.captures.find((c) => c.name === "n")?.node;
        if (!call || !n || n.nextNamedSibling) {
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
                ids.push(result.translation.id);
                strs.push(result.translation.message[0] ?? "");
            }
        }

        if (ids.length === 0) {
            return undefined;
        }

        const translation: Translation = {
            id: ids[0],
            plural: ids[1],
            message: strs,
        };
        if (msgctxt) translation.context = msgctxt;

        return { node: call, translation };
    };
