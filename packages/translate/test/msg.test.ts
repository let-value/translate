import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msg } from '../src/index.ts';

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

test('msg with template string returns composed id and message', () => {
  const name = 'World';
  assert.deepEqual(msg`Hello, ${name}!`, {
    id: 'Hello, World!',
    message: 'Hello, World!',
  });
});

test('msg with invalid argument throws', () => {
  assert.throws(() => msg(123 as any), { message: 'Invalid msg argument' });
});
