import type { GetTextTranslation } from "gettext-parser";

export interface Message {
    msgid: string;
    msgstr: string[];
    references: string[];
    comments: string[];
}

export function collect(raw: GetTextTranslation[]): Message[] {
    const map = new Map<string, Message>();
    for (const m of raw) {
        if (!map.has(m.msgid)) {
            map.set(m.msgid, {
                msgid: m.msgid,
                msgstr: [],
                references: [],
                comments: [],
            });
        }
        const entry = map.get(m.msgid)!;
        if (entry.msgstr.length === 0 && m.msgstr.length) entry.msgstr = m.msgstr;
        if (m.comments?.reference) entry.references.push(m.comments.reference);
        if (m.comments?.extracted) entry.comments.push(m.comments.extracted);
    }
    return Array.from(map.values());
}
