import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg, context } from '../src/helpers.ts';
import { Translator } from '../src/translator.ts';
import fs from 'node:fs';
import * as gettextParser from 'gettext-parser';

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

test('pgettext handles context-specific translations', () => {
  const ruPo = fs.readFileSync(new URL('./fixtures/ru.po', import.meta.url));
  const translations = { ru: gettextParser.po.parse(ruPo) };
  const t = new Translator('en', translations);
  t.useLocale('ru');
  assert.equal(t.pgettext('verb', "Open"), 'Открыть');
  assert.equal(t.pgettext('adjective', "Open"), 'Открытый');
});

test('gettext handles context-aware messages', () => {
  const ruPo = fs.readFileSync(new URL('./fixtures/ru.po', import.meta.url));
  const translations = { ru: gettextParser.po.parse(ruPo) };
  const t = new Translator('en', translations);
  t.useLocale('ru');
  const verb = context('verb');
  assert.equal(t.pgettext(verb.msg('Open')), 'Открыть');
});
