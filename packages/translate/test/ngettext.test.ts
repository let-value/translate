import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg, plural } from '../src/utils.ts';
import { Translator } from '../src/translator.ts';
import fs from 'node:fs';
import gettextParser from 'gettext-parser';

function load(locale: string) {
  const po = fs.readFileSync(new URL(`./fixtures/${locale}.po`, import.meta.url));
  return gettextParser.po.parse(po);
}

const translations = {
  en: load('en'),
  ru: load('ru'),
};

test('ngettext handles English plurals', () => {
  const t = new Translator('en', translations);
  assert.equal(t.ngettext(msg`${1} apple`, msg`${1} apples`, 1), '1 apple');
  assert.equal(t.ngettext(msg`${2} apple`, msg`${2} apples`, 2), '2 apples');
});

test('ngettext handles Russian plurals', () => {
  const t = new Translator('en', translations);
  t.useLocale('ru');
  assert.equal(t.ngettext(msg`${1} apple`, msg`${1} apples`, 1), '1 яблоко');
  assert.equal(t.ngettext(msg`${2} apple`, msg`${2} apples`, 2), '2 яблока');
  assert.equal(t.ngettext(msg`${5} apple`, msg`${5} apples`, 5), '5 яблок');
});

test('ngettext supports plural helper', () => {
  const t = new Translator('en', translations);
  const apples = plural('${0} apple', '${0} apples');
  assert.equal(t.ngettext(apples, 1, 1), '1 apple');
  assert.equal(t.ngettext(apples, 2, 2), '2 apples');
});

test('ngettext supports plural helper with multiple forms', () => {
  const t = new Translator('en', translations);
  t.useLocale('ru');
  const apples = plural('${0} apple', '${0} apples', '${0} many apples');
  assert.equal(t.ngettext(apples, 1, 1), '1 яблоко');
  assert.equal(t.ngettext(apples, 2, 2), '2 яблока');
  assert.equal(t.ngettext(apples, 5, 5), '5 яблок');
});

test('ngettext handles deferred msg objects', () => {
  const t = new Translator('en', translations);
  const sing = msg('${0} apple');
  const plur = msg('${0} apples');
  assert.equal(t.ngettext(sing, plur, 3, 3), '3 apples');
});

test('ngettext works with plain strings', () => {
  const t = new Translator('en', translations);
  assert.equal(t.ngettext('${0} apple', '${0} apples', 1, 1), '1 apple');
  assert.equal(t.ngettext('${0} apple', '${0} apples', 2, 2), '2 apples');
});

test('npgettext handles context with plurals', () => {
  const t = new Translator('en', translations);
  t.useLocale('ru');
  assert.equal(
    t.npgettext('company', msg`${1} apple`, msg`${1} apples`, 1),
    '1 Apple устройство'
  );
  assert.equal(
    t.npgettext('company', msg`${2} apple`, msg`${2} apples`, 2),
    '2 Apple устройства'
  );
});
