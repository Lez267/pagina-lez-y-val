import test from 'node:test';
import assert from 'node:assert/strict';
import { samePublicationValue } from '../src/lib/publication';

test('an uncertain publication can be confirmed after Firestore reorders map keys', () => {
  const expected = { media: [{ id: 'one', url: 'https://example.test/a.jpg', type: 'image' }], reminder: { enabled: true, date: '2026-10-17' } };
  const saved = { reminder: { date: '2026-10-17', enabled: true }, media: [{ type: 'image', url: 'https://example.test/a.jpg', id: 'one' }] };
  assert.equal(samePublicationValue(saved, expected), true);
});

test('a conflicting retry cannot confirm changed media, ordering, or types', () => {
  assert.equal(samePublicationValue([{ id: 'one' }, { id: 'two' }], [{ id: 'two' }, { id: 'one' }]), false);
  assert.equal(samePublicationValue({ title: 'Otro recuerdo' }, { title: 'Un recuerdo' }), false);
  assert.equal(samePublicationValue({ count: '1' }, { count: 1 }), false);
  assert.equal(samePublicationValue({ extra: true, id: 'one' }, { id: 'one' }), false);
});
