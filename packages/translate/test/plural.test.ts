import { test } from 'node:test';
import assert from 'node:assert/strict';

import { msg, plural } from '../src/helpers.ts';

test('msg with string returns id and message', () => {
  assert.deepEqual(plural(msg("hello"), 1), { forms: [{ id: 'hello', message: 'hello' }], n: 1 });
});

test('plural supports arbitrary number of forms', () => {
  const forms = plural(msg`${0} apple`, msg`${0} apples`, msg`${0} many apples`, 3);
  assert.deepEqual(forms.forms[0], { id: '${0} apple', message: '${0} apple', values: [0] });
  assert.deepEqual(forms.forms[1], { id: '${0} apples', message: '${0} apples', values: [0] });
  assert.deepEqual(forms.forms[2], { id: '${0} many apples', message: '${0} many apples', values: [0] });
  assert.equal(forms.n, 3);
});

