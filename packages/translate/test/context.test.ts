import { test } from 'node:test';
import assert from 'node:assert/strict';
import { context } from '../src/utils.ts';

test('context builder attaches context to msg', () => {
  const verb = context('verb');
  assert.deepEqual(verb.msg('Open'), { id: 'Open', message: 'Open', context: 'verb' });
});

test('context builder attaches context to plural', () => {
  const company = context('company');
  const p = company.plural('${0} apple', '${0} apples');
  assert.equal(p.context, 'company');
  assert.equal(p.forms[0].message, '${0} apple');
  assert.equal(p.forms[1].message, '${0} apples');
});
