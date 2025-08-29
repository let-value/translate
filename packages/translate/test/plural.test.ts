import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plural } from '../src/utils.ts';

test('plural supports arbitrary number of forms', () => {
  const forms = plural('${0} apple', '${0} apples', '${0} many apples');
  assert.equal(forms.forms.length, 3);
  assert.equal(forms.forms[0].message, '${0} apple');
  assert.equal(forms.forms[1].message, '${0} apples');
  assert.equal(forms.forms[2].message, '${0} many apples');
});

