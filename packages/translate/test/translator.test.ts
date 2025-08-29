import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg } from '../src/utils.ts';
import { Translator } from '../src/translator.ts';
import fs from 'node:fs';
import gettextParser from 'gettext-parser';

test('translator substitutes template values', () => {
  const name = 'World';
  const t = new Translator('en', {});
  assert.equal(t.gettext(msg`Hello, ${name}!`), 'Hello, World!');
});

test('translator applies translations with placeholders', () => {
  const name = 'World';
  const ruPo = fs.readFileSync(new URL('./fixtures/ru.po', import.meta.url));
  const translations = { ru: gettextParser.po.parse(ruPo) };
  const t = new Translator('en', translations);
  t.useLocale('ru');
  assert.equal(t.gettext(msg`Hello, ${name}!`), 'Привет, World!');
});
