import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg, plural } from '../src/utils.ts';
import { Translator } from '../src/translator.ts';

const translations = {
  en: {
    translations: {
      '': {
        '': {
          msgid: '',
          msgstr: ['Plural-Forms: nplurals=2; plural=(n != 1);\n'],
        },
        '${0} apple': {
          msgid: '${0} apple',
          msgid_plural: '${0} apples',
          msgstr: ['${0} apple', '${0} apples'],
        },
      },
    },
  },
  ru: {
    translations: {
      '': {
        '': {
          msgid: '',
          msgstr: [
            'Plural-Forms: nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);\n',
          ],
        },
        '${0} apple': {
          msgid: '${0} apple',
          msgid_plural: '${0} apples',
          msgstr: ['${0} яблоко', '${0} яблока', '${0} яблок'],
        },
      },
    },
  },
} as any;

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
