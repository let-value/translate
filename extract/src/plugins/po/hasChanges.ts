import type { GetTextTranslations } from "gettext-parser";
import * as gettextParser from "gettext-parser";
import { isDeepStrictEqual } from "node:util";

const IGNORED_HEADER_KEYS = new Set(["pot-creation-date", "po-revision-date"]);
const IGNORED_HEADER_LINE_PREFIXES = ["pot-creation-date:", "po-revision-date:"];

function normaliseHeaderString(value: string): string {
    const lines = value.split("\n");
    const hadTrailingNewline = value.endsWith("\n");

    const filtered = lines
        .filter((line) => {
            const trimmed = line.trimStart().toLowerCase();
            return !IGNORED_HEADER_LINE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
        })
        .map((line) => {
            const separatorIndex = line.indexOf(":");
            if (separatorIndex === -1) {
                return line;
            }

            const key = line.slice(0, separatorIndex).trim().toLowerCase();
            const value = line.slice(separatorIndex + 1);
            return `${key}:${value}`;
        });

    if (hadTrailingNewline && filtered[filtered.length - 1] !== "") {
        filtered.push("");
    }

    return filtered.join("\n");
}

function normalise(translations: GetTextTranslations): GetTextTranslations {
    const compiled = gettextParser.po.compile(translations);
    const parsed = gettextParser.po.parse(compiled);

    if (parsed.headers) {
        const normalisedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed.headers)) {
            if (!IGNORED_HEADER_KEYS.has(key.toLowerCase())) {
                normalisedHeaders[key.toLowerCase()] = value as string;
            }
        }
        parsed.headers = normalisedHeaders;
    }

    const headerMessage = parsed.translations?.[""]?.[""];
    if (headerMessage?.msgstr) {
        headerMessage.msgstr = headerMessage.msgstr.map((item) => normaliseHeaderString(item));
    }

    return parsed;
}

export function hasChanges(left: GetTextTranslations, right?: GetTextTranslations): boolean {
    if (!right) {
        return true;
    }

    const normalisedLeft = normalise(left);
    const normalisedRight = normalise(right);

    return !isDeepStrictEqual(normalisedLeft, normalisedRight);
}
