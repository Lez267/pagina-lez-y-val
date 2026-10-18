import test from 'node:test';
import assert from 'node:assert/strict';
import { newPublicationMedia, samePublicationValue } from '../src/lib/publication';
import type { MediaItem } from '../src/data/types';

test('twenty new files have unique ordinal IDs and keep their original asset receipts unchanged', () => {
  const receipts: MediaItem[] = Array.from({ length: 20 }, (_, i) => ({ id: `upload-${i}`, type: 'image', url: `https://example.test/${i}.jpg`, storagePath: `namespace/${i}` }));
  const original = structuredClone(receipts);
  const media = newPublicationMedia('AbCdEfGhIjKlMnOpQrSt', receipts);
  assert.equal(new Set(media.map(item => item.id)).size, 20);
  assert.equal(media[19].id, 'AbCdEfGhIjKlMnOpQrSt-media-20');
  media.forEach((item, index) => { assert.equal(item.url, receipts[index].url); assert.equal(item.storagePath, receipts[index].storagePath); });
  assert.deepEqual(receipts, original);
  assert.deepEqual(newPublicationMedia('AbCdEfGhIjKlMnOpQrSt', receipts), media);
  assert.throws(() => newPublicationMedia('invalid/id', receipts));
  assert.throws(() => newPublicationMedia('AbCdEfGhIjKlMnOpQrSt', [...receipts, receipts[0]]));
});

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
