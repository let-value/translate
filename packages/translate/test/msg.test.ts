import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg, Translator } from '../src/index.ts';

test('msg with string returns id and message', () => {
  assert.deepEqual(msg('hello'), { id: 'hello', message: 'hello' });
});

test('msg with descriptor uses id and message', () => {
  const descriptor = { id: 'greeting', message: 'Hello world' };
  assert.deepEqual(msg(descriptor), { id: 'greeting', message: 'Hello world' });
});

test('msg with descriptor id only uses it for message too', () => {
  const descriptor = { id: 'onlyId' };
  assert.deepEqual(msg(descriptor), { id: 'onlyId', message: 'onlyId' });
});

test('msg with descriptor message only uses it for id too', () => {
  const descriptor = { message: 'onlyMessage' };
  assert.deepEqual(msg(descriptor), { id: 'onlyMessage', message: 'onlyMessage' });
});

test('msg with template string returns placeholders and values', () => {
  const name = 'World';
  assert.deepEqual(msg`Hello, ${name}!`, {
    id: 'Hello, ${0}!',
    message: 'Hello, ${0}!',
    values: [name],
  });
});

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

test('msg disallows computed strings', () => {
  const variable: string = 'v';
  // @ts-expect-error computed strings are not allowed
  msg('Computed' + variable + 'string');
});

test('msg with invalid argument throws', () => {
  assert.throws(() => msg(123 as any), { message: 'Invalid msg argument' });
});
