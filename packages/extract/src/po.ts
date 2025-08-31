import * as gettextParser from 'gettext-parser';
import { getFormula, getNPlurals } from 'plural-forms';
import type { GetTextTranslation } from 'gettext-parser';

export interface Message {
  msgid: string;
  msgstr: string[];
  references: string[];
  comments: string[];
}

/** Combine raw messages into unique translation messages. */
export function collect(raw: GetTextTranslation[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of raw) {
    if (!map.has(m.msgid)) {
      map.set(m.msgid, { msgid: m.msgid, msgstr: [], references: [], comments: [] });
    }
    const entry = map.get(m.msgid)!;
    if (entry.msgstr.length === 0 && m.msgstr.length) entry.msgstr = m.msgstr;
    if (m.comments?.reference) entry.references.push(m.comments.reference);
    if (m.comments?.extracted) entry.comments.push(m.comments.extracted);
  }
  return Array.from(map.values());
}

/** Build a PO file string from messages and locale. */
export function buildPo(locale: string, messages: Message[]): string {
  const headers = {
    'content-type': 'text/plain; charset=UTF-8',
    'plural-forms': `nplurals=${getNPlurals(locale)}; plural=${getFormula(locale)};`,
    language: locale
  } as Record<string, string>;

  const poObj: any = {
    charset: 'utf-8',
    headers,
    translations: { '': {} as Record<string, any> }
  };

  for (const m of messages) {
    poObj.translations[''][m.msgid] = {
      msgid: m.msgid,
      msgstr: m.msgstr.length ? m.msgstr : [''],
      references: m.references.join('\n'),
      comments: m.comments.length ? { extracted: m.comments.join('\n') } : undefined
    };
  }

  return gettextParser.po.compile(poObj).toString();
}

