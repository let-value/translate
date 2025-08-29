import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg } from '../src/utils.ts';
import { Translator } from '../src/translator.ts';

test('translator substitutes template values', () => {
  const name = 'World';
  const t = new Translator('en', {});
  assert.equal(t.gettext(msg`Hello, ${name}!`), 'Hello, World!');
});

test('translator applies translations with placeholders', () => {
  const name = 'World';
  const translations = {
    ru: {
      translations: {
        '': {
          'Hello, ${0}!': { msgid: 'Hello, ${0}!', msgstr: ['Привет, ${0}!'] },
        },
      },
    },
  } as any;
  const t = new Translator('en', translations);
  t.useLocale('ru');
  assert.equal(t.gettext(msg`Hello, ${name}!`), 'Привет, World!');
});
