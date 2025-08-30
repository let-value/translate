import { test } from 'node:test';
import assert from 'node:assert/strict';
import { context, msg } from '../src/helpers.ts';

test('context builder attaches context to msg', () => {
  const verb = context('verb');
  assert.deepEqual(verb.msg('Open'), { context: 'verb', id: { id: 'Open', message: 'Open' } });
});

test('context builder attaches context to plural', () => {
  const company = context('company');
  const p = company.plural(msg`${0} apple`, msg`${0} apples`, 2);
  assert.equal(p.context, 'company');
  assert.equal(p.id.forms[0].msgstr, '${0} apple');
  assert.equal(p.id.forms[1].msgstr, '${0} apples');
});
