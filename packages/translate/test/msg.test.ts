import { test } from 'node:test';
import assert from 'node:assert/strict';

import { msg } from '../src/helpers.ts';

test('msg with string returns id and message', () => {
  assert.deepEqual(msg('hello'), { msgid: 'hello', msgstr: 'hello' });
});

test('msg with descriptor uses id and message', () => {
  const descriptor = { id: 'greeting', message: 'Hello world' };
  assert.deepEqual(msg(descriptor), { msgid: 'greeting', msgstr: 'Hello world' });
});

test('msg with descriptor id only uses it for message too', () => {
  const descriptor = { id: 'onlyId' };
  assert.deepEqual(msg(descriptor), { msgid: 'onlyId', msgstr: 'onlyId' });
});

test('msg with descriptor message only uses it for id too', () => {
  const descriptor = { message: 'onlyMessage' };
  assert.deepEqual(msg(descriptor), { msgid: 'onlyMessage', msgstr: 'onlyMessage' });
});

test('msg with template string returns placeholders and values', () => {
  const name = 'World';
  assert.deepEqual(msg`Hello, ${name}!`, {
    msgid: 'Hello, ${0}!',
    msgstr: 'Hello, ${0}!',
    values: [name],
  });
});

test('msg disallows computed strings', () => {
  const variable: string = 'v';
  // @ts-expect-error computed strings are not allowed
  msg('Computed' + variable + 'string');
});

test('msg disallows variables', () => {
  let name = 'World';
  // @ts-expect-error dynamic template strings are not allowed
  msg(name);
});
