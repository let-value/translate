import * as gettextParser from 'gettext-parser';
import { getFormula, getNPlurals } from 'plural-forms';
import { RawMessage } from './parse';

export interface Message {
  msgid: string;
  references: string[];
  comments: string[];
}

/** Combine raw messages into unique translation messages. */
export function collect(raw: RawMessage[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of raw) {
    if (!map.has(m.msgid)) {
      map.set(m.msgid, { msgid: m.msgid, references: [], comments: [] });
    }
    const entry = map.get(m.msgid)!;
    entry.references.push(m.reference);
    if (m.comment) entry.comments.push(m.comment);
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
      msgstr: [''],
      references: m.references.join('\n'),
      comments: m.comments.length ? { extracted: m.comments.join('\n') } : undefined
    };
  }

  return gettextParser.po.compile(poObj).toString();
}

