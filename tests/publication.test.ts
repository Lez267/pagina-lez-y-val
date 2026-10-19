import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePublicationMedia, encodePublicationMedia, newPublicationMedia, samePublicationValue } from '../src/lib/publication';
import type { MediaItem } from '../src/data/types';
import { normalizeMemory } from '../src/data/normalizer';

function receipt(index: number): MediaItem {
  const type = index === 19 ? 'video' : 'image';
  const storagePath = `nuestro-universo/${'b'.repeat(24)}/00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  return { id: `receipt-${index}`, type, storagePath, url: `https://res.cloudinary.com/dc7x4qjzu/${type}/upload/v123/${storagePath}.${type === 'video' ? 'mp4' : 'jpg'}` };
}

test('compact twenty-file records reconstruct exact URLs, kinds, public IDs and selected cover after reload', () => {
  const id = 'AbCdEfGhIjKlMnOpQrSt';
  const uploaded = Array.from({ length: 20 }, (_, index) => receipt(index));
  const original = structuredClone(uploaded);
  const encoded = encodePublicationMedia(id, uploaded, 19);
  assert.equal(encoded.schemaVersion, 2);
  assert.ok(encoded.media.every(url => typeof url === 'string'));
  const raw = { ...encoded, title: 'Un recuerdo', photoDate: '2026-10-17' };
  const before = structuredClone(raw);
  const normalized = normalizeMemory(id, raw);
  assert.deepEqual(normalized.media, newPublicationMedia(id, uploaded));
  assert.equal(normalized.coverMediaId, `${id}-media-20`);
  assert.equal(normalized.media[19].type, 'video');
  assert.deepEqual(raw, before);
  assert.deepEqual(uploaded, original);
});

test('compact publication encoding rejects ambiguous or forged asset receipts before committing', () => {
  const id = 'AbCdEfGhIjKlMnOpQrSt', file = receipt(0);
  assert.throws(() => encodePublicationMedia(id, [file, file], 0), /más de una vez/);
  assert.throws(() => encodePublicationMedia(id, [{ ...file, type: 'video' }], 0), /comprobar/);
  assert.throws(() => encodePublicationMedia(id, [{ ...file, storagePath: 'another/file' }], 0), /comprobar/);
  assert.throws(() => encodePublicationMedia(id, [file], 1), /portada/);
  for (const value of [null, 7, file.url.replace('dc7x4qjzu', 'another-cloud'), file.url + '?download=true', 'javascript:alert(1)']) assert.equal(decodePublicationMedia(value), null);
});

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
